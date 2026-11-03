// Text-to-speech using the browser's built-in voices (Web Speech API).
//
// How natural it sounds depends almost entirely on the voice, so we pick the
// best one available (neural/"natural"/enhanced voices first) and let parents
// choose another in Customize → Learning. Better voices can be added:
//   macOS / iOS: Settings → Accessibility → Spoken Content → System Voice → Manage Voices
//   Microsoft Edge ships natural online voices for many languages.

import { learnLang } from './numbers.js';

// Words in voice names that mean "high quality".
const GOOD = /natural|neural|online|premium|enhanced|geliştirilmiş|wavenet|siri/i;

export class Speech {
  /** @param {{ learning: { voices?: Record<string, string> } }} settings */
  constructor(settings) {
    this.settings = settings;
    this.supported = 'speechSynthesis' in window;
    this.voices = [];
    this.listeners = new Set();
    if (!this.supported) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices();
      for (const fn of this.listeners) fn();
    };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }

  /** Calls `fn` whenever the list of voices changes (they load asynchronously). */
  onVoicesChanged(fn) {
    this.listeners.add(fn);
  }

  /** Voices for a language, best first. */
  voicesFor(langId) {
    const tag = learnLang(langId).speechLang;
    const base = tag.split('-')[0];
    const norm = (v) => v.lang.replace('_', '-');
    const rank = (v) => (GOOD.test(v.name) ? 0 : 4) + (norm(v) === tag ? 0 : 2) + (v.localService ? 0 : 1);
    return this.voices
      .filter((v) => norm(v).toLowerCase().split('-')[0] === base)
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }

  /** The chosen voice for a language, or the best one. */
  voiceFor(langId) {
    const list = this.voicesFor(langId);
    const chosen = this.settings.learning.voices?.[langId];
    return list.find((v) => v.voiceURI === chosen) ?? list[0] ?? null;
  }

  hasVoice(langId) {
    return !!this.voiceFor(langId);
  }

  cancel() {
    if (this.supported) speechSynthesis.cancel();
  }

  /**
   * Speaks the steps in order. Each step is a string or { text, onStart }.
   * Resolves when the last one finishes (or immediately if speech isn't available).
   */
  say(steps, langId, { rate = 0.92, interrupt = true } = {}) {
    if (!this.supported) return Promise.resolve();
    if (interrupt) speechSynthesis.cancel();
    const tag = learnLang(langId).speechLang;
    const voice = this.voiceFor(langId);
    const list = (Array.isArray(steps) ? steps : [steps]).map((s) => (typeof s === 'string' ? { text: s } : s));
    return new Promise((resolve) => {
      // Some browsers never fire `end` (no voice installed, tab in background…),
      // so don't let callers wait forever.
      const chars = list.reduce((n, s) => n + s.text.length, 0);
      setTimeout(resolve, 1500 + (chars * 110) / rate);
      list.forEach((step, i) => {
        const u = new SpeechSynthesisUtterance(sentence(step.text, tag));
        u.lang = tag;
        if (voice) u.voice = voice;
        u.rate = rate;
        u.pitch = 1; // shifting the pitch makes most voices sound more robotic
        u.onstart = () => step.onStart?.();
        if (i === list.length - 1) u.onend = u.onerror = () => resolve();
        speechSynthesis.speak(u);
      });
      if (!list.length) resolve();
    });
  }
}

/**
 * Voices take their intonation from punctuation and capitals: "üç yüz" is read
 * flat, "Üç yüz." falls at the end like a real sentence.
 */
function sentence(text, tag) {
  const t = text.trim();
  if (!t) return t;
  const capped = t[0].toLocaleUpperCase(tag) + t.slice(1);
  return /[.!?…:]$/.test(capped) ? capped : `${capped}.`;
}
