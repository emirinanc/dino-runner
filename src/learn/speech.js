// Text-to-speech using the browser's built-in voices (Web Speech API).
// On macOS, Chrome has a Turkish voice ("Yelda"); more can be added in
// System Settings → Accessibility → Spoken Content → System voice → Manage Voices.

import { learnLang } from './numbers.js';

export class Speech {
  constructor() {
    this.supported = 'speechSynthesis' in window;
    this.voices = [];
    if (!this.supported) return;
    const load = () => (this.voices = speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }

  voiceFor(tag) {
    const base = tag.split('-')[0];
    const matches = this.voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base));
    return matches.find((v) => v.lang.replace('_', '-') === tag && v.localService) ?? matches.find((v) => v.localService) ?? matches[0] ?? null;
  }

  hasVoice(langId) {
    return !!this.voiceFor(learnLang(langId).speechLang);
  }

  cancel() {
    if (this.supported) speechSynthesis.cancel();
  }

  /**
   * Speaks the steps in order. Each step is a string or { text, onStart }.
   * Resolves when the last one finishes (or immediately if speech isn't available).
   */
  say(steps, langId, { rate = 0.85, interrupt = true } = {}) {
    if (!this.supported) return Promise.resolve();
    if (interrupt) speechSynthesis.cancel();
    const tag = learnLang(langId).speechLang;
    const voice = this.voiceFor(tag);
    const list = (Array.isArray(steps) ? steps : [steps]).map((s) => (typeof s === 'string' ? { text: s } : s));
    return new Promise((resolve) => {
      // Some browsers never fire `end` (no voice installed, tab in background…),
      // so don't let callers wait forever.
      const chars = list.reduce((n, s) => n + s.text.length, 0);
      setTimeout(resolve, 1500 + (chars * 110) / rate);
      list.forEach((step, i) => {
        const u = new SpeechSynthesisUtterance(step.text);
        u.lang = tag;
        if (voice) u.voice = voice;
        u.rate = rate;
        u.pitch = 1.1;
        u.onstart = () => step.onStart?.();
        if (i === list.length - 1) u.onend = u.onerror = () => resolve();
        speechSynthesis.speak(u);
      });
      if (!list.length) resolve();
    });
  }
}
