// Cypress support: browser stubs and a few commands. See docs/test-strategy.md.
//
// Every page load (including cy.reload) gets:
//   - speechSynthesis / SpeechSynthesisUtterance replaced by a recorder
//   - HTMLMediaElement.play recorded instead of played (voice clips)
//   - prefers-reduced-motion forced on (no swap animation to wait for)
//   - console.error collected; any error fails the test in afterEach
// What was "heard" is in window.__heard = { clips: [path…], spoken: [{ text, voice }…] }.

import { CONFIG } from '../../src/config.js';

/** Fake browser voices offered by the stubbed speechSynthesis. */
export const VOICES = [
  { name: 'Yelda', lang: 'tr-TR', localService: true, voiceURI: 'test:Yelda', default: false },
  { name: 'Samantha', lang: 'en-US', localService: true, voiceURI: 'test:Samantha', default: true },
];

function installStubs(win) {
  const heard = (win.__heard = { clips: [], spoken: [] });
  win.__consoleErrors = [];

  const origError = win.console.error.bind(win.console);
  win.console.error = (...args) => {
    win.__consoleErrors.push(args.map(String).join(' '));
    origError(...args);
  };

  const synth = {
    speaking: false, pending: false, paused: false,
    getVoices: () => VOICES,
    addEventListener() {}, removeEventListener() {},
    cancel() {}, pause() {}, resume() {},
    speak(u) {
      heard.spoken.push({ text: u.text, voice: u.voice?.name ?? null, lang: u.lang });
      setTimeout(() => {
        u.onstart?.();
        u.onend?.();
      }, 10);
    },
  };
  Object.defineProperty(win, 'speechSynthesis', { value: synth, configurable: true });
  win.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };

  win.HTMLMediaElement.prototype.play = function play() {
    const src = this.getAttribute('src') ?? this.src;
    if (!src.startsWith('data:')) heard.clips.push(src.replace(win.location.origin + '/', ''));
    setTimeout(() => this.onended?.(), 10);
    return Promise.resolve();
  };
  win.HTMLMediaElement.prototype.pause = function pause() {};

  const matchMedia = win.matchMedia.bind(win);
  win.matchMedia = (q) => (q.includes('prefers-reduced-motion')
    ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
    : matchMedia(q));
}

Cypress.on('window:before:load', installStubs);

beforeEach(() => {
  // Voice clips: let the real manifest through (aliased so tests can wait on
  // it, network-first), but don't download the mp3s: play() is stubbed anyway.
  cy.intercept('GET', '**/audio/*/manifest.json').as('manifest');
  cy.intercept('GET', '**/audio/*/*.mp3', { statusCode: 200, body: '', headers: { 'content-type': 'audio/mpeg' } }).as('clip');
});

afterEach(() => {
  cy.window({ log: false }).then((win) => {
    expect(win.__consoleErrors ?? [], 'console errors').to.deep.equal([]);
  });
});

/**
 * Opens the game with known settings (UI in English, numbers in Turkish by
 * default) and waits for the voice-clip manifest unless told not to.
 */
Cypress.Commands.add('visitGame', (path = '/', { settings = {}, waitForClips = true } = {}) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('dino-runner:settings', JSON.stringify({ lang: 'en', ...settings }));
    },
  });
  cy.window().its('ui').should('exist');
  if (waitForClips) cy.wait('@manifest');
});

/** Presses Space wherever the focus is, like the keyboard would. */
Cypress.Commands.add('pressSpace', () => {
  cy.window().then((win) => {
    const target = win.document.activeElement ?? win.document.body;
    for (const type of ['keydown', 'keyup']) {
      target.dispatchEvent(new win.KeyboardEvent(type, { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
    }
  });
});

/** Ends a run with a given score, the same way a crash does. */
Cypress.Commands.add('endRun', (score) => {
  cy.window().then((win) => {
    win.game.restart();
    win.game.distance = score / CONFIG.score.coefficient;
    win.game.crash(win.performance.now());
  });
});

/** What has been heard so far: { clips, spoken }. */
Cypress.Commands.add('heard', () => cy.window().its('__heard'));
