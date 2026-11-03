// Speaking numbers and phrases.
//
// 1. Natural voice clips: audio/<lang>/manifest.json maps every sentence the
//    game can say to a pre-generated recording (see tools/voice/generate.mjs).
//    An utterance is played from clips when every one of its sentences has one.
// 2. Otherwise the browser's own voices (Web Speech API). How natural they
//    sound depends on the device: neural/"natural"/enhanced voices are picked
//    first, and parents can choose another in Customize → Learning. Better
//    voices can be added in macOS / iOS: Settings → Accessibility → Spoken
//    Content → System Voice → Manage Voices.

import { learnLang } from './numbers.js';

const CLIPS = 'audio';
// Words in voice names that mean "high quality".
const GOOD = /natural|neural|online|premium|enhanced|geliştirilmiş|wavenet|siri/i;
// A moment of silence, played on the first tap so mobile browsers allow audio later.
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

export class Speech {
  /** @param {{ learning: { lang: string, voices?: Record<string, string> } }} settings */
  constructor(settings) {
    this.settings = settings;
    this.supported = 'speechSynthesis' in window;
    this.voices = [];
    this.listeners = new Set();
    this.clips = {}; // langId → manifest (null when the language has none)
    this.loading = {};
    this.token = 0; // bumped by cancel(), stops clip sequences in progress
    this.audio = new Audio();
    this.loadClips(settings.learning.lang);

    const unlock = () => {
      this.audio.src = SILENCE;
      this.audio.play().catch(() => {});
      removeEventListener('pointerdown', unlock, true);
      removeEventListener('keydown', unlock, true);
    };
    addEventListener('pointerdown', unlock, true);
    addEventListener('keydown', unlock, true);

    if (!this.supported) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices();
      this.changed();
    };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }

  /** Calls `fn` whenever the available voices or clips change (they load asynchronously). */
  onVoicesChanged(fn) {
    this.listeners.add(fn);
  }

  changed() {
    for (const fn of this.listeners) fn();
  }

  // --- natural voice clips ----------------------------------------------------

  loadClips(langId) {
    this.loading[langId] ??= fetch(`${CLIPS}/${langId}/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((manifest) => {
        this.clips[langId] = manifest;
        this.changed();
        return manifest;
      });
    return this.loading[langId];
  }

  /** The clip set to use for a language: when it exists and no browser voice was chosen instead. */
  clipsFor(langId) {
    this.loadClips(langId);
    const manifest = this.clips[langId];
    return manifest && !this.settings.learning.voices?.[langId] ? manifest : null;
  }

  /** Name of the natural voice for a language, if it has clips. */
  clipVoiceName(langId) {
    return this.clips[langId]?.label ?? null;
  }

  clipUrl(langId, sentence) {
    const file = this.clips[langId]?.clips[sentence];
    return file ? `${CLIPS}/${langId}/${file}` : null;
  }

  /** Downloads the clips for these utterances ahead of time, so they play without delay. */
  prefetch(texts, langId) {
    if (!this.clipsFor(langId)) return;
    const tag = learnLang(langId).speechLang;
    for (const text of texts) {
      for (const s of sentences(text, tag)) {
        const url = this.clipUrl(langId, s);
        if (url) fetch(url).catch(() => {});
      }
    }
  }

  // --- browser voices -----------------------------------------------------------

  /** Browser voices for a language, best first. */
  voicesFor(langId) {
    const tag = learnLang(langId).speechLang;
    const base = tag.split('-')[0];
    const norm = (v) => v.lang.replace('_', '-');
    const rank = (v) => (GOOD.test(v.name) ? 0 : 4) + (norm(v) === tag ? 0 : 2) + (v.localService ? 0 : 1);
    return this.voices
      .filter((v) => norm(v).toLowerCase().split('-')[0] === base)
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }

  /** The chosen browser voice for a language, or the best one. */
  voiceFor(langId) {
    const list = this.voicesFor(langId);
    const chosen = this.settings.learning.voices?.[langId];
    return list.find((v) => v.voiceURI === chosen) ?? list[0] ?? null;
  }

  hasVoice(langId) {
    return !!this.clips[langId] || !!this.voiceFor(langId);
  }

  // --- speaking -------------------------------------------------------------------

  cancel() {
    this.token++;
    this.audio.pause();
    this.stopClip?.();
    if (this.supported) speechSynthesis.cancel();
  }

  /**
   * Speaks the steps in order, interrupting whatever was being said. Each step
   * is a string or { text, onStart }. Resolves when the last one finishes (or
   * is interrupted), or right away if nothing can speak.
   */
  say(steps, langId, { rate = 0.92 } = {}) {
    this.cancel();
    const tag = learnLang(langId).speechLang;
    const list = (Array.isArray(steps) ? steps : [steps]).map((s) => (typeof s === 'string' ? { text: s } : s));

    // One voice per utterance: clips only if every sentence has one.
    if (this.clipsFor(langId)) {
      const parts = list.flatMap((step) =>
        sentences(step.text, tag).map((text, i) => ({ url: this.clipUrl(langId, text), onStart: i ? null : step.onStart })));
      if (parts.length && parts.every((p) => p.url)) return this.playClips(parts);
    }
    return this.speakWithBrowser(list, langId, rate);
  }

  async playClips(parts) {
    const token = this.token;
    for (const part of parts) {
      if (token !== this.token) return;
      part.onStart?.();
      await this.playClip(part.url);
    }
  }

  playClip(url) {
    return new Promise((resolve) => {
      const audio = this.audio;
      const done = () => {
        audio.onended = audio.onerror = null;
        clearTimeout(timer);
        this.stopClip = null;
        resolve();
      };
      const timer = setTimeout(done, 15000); // never hang on a clip that doesn't load
      this.stopClip = done;
      audio.onended = audio.onerror = done;
      audio.src = url;
      audio.play().catch(done);
    });
  }

  speakWithBrowser(list, langId, rate) {
    if (!this.supported) return Promise.resolve();
    const tag = learnLang(langId).speechLang;
    const voice = this.voiceFor(langId);
    return new Promise((resolve) => {
      // Some browsers never fire `end` (no voice installed, tab in background…),
      // so don't let callers wait forever.
      const chars = list.reduce((n, s) => n + s.text.length, 0);
      setTimeout(resolve, 1500 + (chars * 110) / rate);
      list.forEach((step, i) => {
        const u = new SpeechSynthesisUtterance(polish(step.text, tag));
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
function polish(text, tag) {
  const capped = text.trim().replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, before, c) => before + c.toLocaleUpperCase(tag));
  return !capped || /[.!?…:]$/.test(capped) ? capped : `${capped}.`;
}

/**
 * Splits an utterance into the sentences that clips are recorded for:
 * "Aferin! bir artı altı, yedi eder!" → ["Aferin!", "Bir artı altı, yedi eder!"]
 */
export function sentences(text, tag) {
  return polish(text, tag).split(/(?<=[.!?])\s+/).filter(Boolean);
}
