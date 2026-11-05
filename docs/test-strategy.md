# Test strategy

How Dino Runner is tested, and why. The aim is to be able to change the game
without worrying about breaking what the child relies on: the right number
words, the natural voice, and a number game that works.

The approach comes from the BMAD Test Architect ("Murat", `bmad-tea` in the
swap-cycle repo), mainly its **Test Design** workflow (testability review, risk
matrix, coverage plan) and its **Framework** workflow, scaled down for a small
static game with no build step. What was taken and what was skipped is listed
at the end.

## Running the tests

```sh
npm install          # dev tools only; the site itself still needs no build and no node_modules
npm test             # unit tests (Vitest), about 1 s
npm run test:e2e     # end-to-end tests (Cypress, headless Electron), about 40 s
npm run test:all     # both
npm run test:watch   # unit tests, re-run on save
npm run test:e2e:open  # Cypress UI, to watch or debug a spec
```

`test:e2e` starts `scripts/serve.mjs`, a tiny static server on port **8765**,
so it doesn't clash with a dev server on 8080 (`npm start`). To run Cypress
against another server: `BASE_URL=http://localhost:8080 npx cypress run`.

## Testability review

**What already makes testing easy**

- Most learning logic is in pure modules: `numbers.js`, `phrases.js`,
  `storage.js`, the art grids, `spritesCollide`.
- The components take their dependencies as arguments. `NumberGame` and
  `ScoreCard` get `speech`, `settings` and `t` passed in, so a test can hand
  them a recording speech object and a fake `t`.
- `window.game` and `window.ui` are exposed, so e2e tests can set up a state
  directly (end a run with a given score) instead of playing.
- All state is in `localStorage`, so a test can start from any settings.
- The DOM reports state through attributes: `aria-pressed` on the picker
  buttons, `hidden`, `disabled`, and `aria-label` on the reward counter.

**Concerns, and how the tests handle them**

| Concern | Handling |
|---|---|
| Randomness (`Math.random`) is used directly in `numbergame.js` | Unit tests replace it with a seeded generator (`seedMath`). E2E tests swap in fixed questions with `ui.numberGame.makeQuestions = () => CHAIN`. No source changes needed. |
| Timers: the number game waits 1.2 s after a right answer and 0.5 s per counted picture | Unit tests use fake timers (`vi.advanceTimersByTimeAsync`). E2E tests use real time with instant speech stubs and wait on conditions, never on fixed delays. |
| Speech and audio are real browser APIs | Stubbed with recorders in both unit and e2e tests (see "Stubs" below). |
| The canvas has no DOM to assert on | Game logic is checked through `window.game` state. Visuals are checked by hand in `tools/gallery.html`. jsdom has no canvas, so `getContext` is stubbed in `sprites.test.js`. |
| The voice-clip manifest loads asynchronously | E2E tests intercept it before navigating (network-first) and wait for it. A regression test delays it on purpose. |

## Risk assessment

Probability (P) and impact (I) are scored 1–3. Score = P × I: 6 or more must be
covered by tests, 4–5 watched, 1–3 just documented. Impact is measured against
the purpose of the game: a 4.5-year-old learning numbers in Turkish.

| ID | Cat. | Risk | P | I | Score | Covered by |
|---|---|---|---|---|---|---|
| R1 | TECH | Wrong voice: the robotic browser voice plays instead of the Puck clips (manifest race, chosen voice ignored, a sentence with no clip). This has already happened (zero, "sıfır") | 3 | 3 | **9** | `speech.test.js`, `voice.cy.js` |
| R2 | BUS | Wrong number words or suffixes (vowel harmony, consonant hardening, "yüz" vs "bir yüz") teach the wrong thing | 2 | 3 | **6** | `numbers.test.js` |
| R3 | TECH | A phrase changes in code but the clips aren't regenerated, so that sentence falls back to the browser voice without any error | 3 | 2 | **6** | `phrases.test.js`, plus a test in `numbergame.test.js` that checks every utterance from simulated play |
| R4 | BUS | Number game produces an invalid question: a sum above the limit, or a chain step that isn't one swap or ±1 | 2 | 3 | **6** | `numbergame.test.js` (900 seeded rounds per limit) |
| R5 | BUS | Round flow breaks: a wrong answer doesn't lead to counting together, the reward counter doesn't go up, the final screen doesn't appear | 2 | 3 | **6** | `numbergame.test.js`, `numbergame.cy.js` |
| R6 | TECH | Keyboard and dialogs interfere: Space starts the game behind an open dialog, or Space on the final screen doesn't return to the game. Both have regressed before | 3 | 2 | **6** | `dialogs.cy.js`, `numbergame.cy.js`, `numbergame.test.js` |
| R7 | DATA | A settings change in a new version drops what the parent picked (character, voice, limit) | 2 | 2 | 4 | `storage.test.js`, `settings.cy.js` |
| R8 | TECH | A hand-edited art grid breaks: ragged rows, a missing accessory anchor, frames of different sizes, collisions affected by accessories | 2 | 2 | 4 | `characters.test.js`, `sprites.test.js` |
| R9 | OPS | The page doesn't load on GitHub Pages (a module error or a missing file) | 1 | 3 | 3 | `smoke.cy.js`; every e2e test fails if the app doesn't boot or logs a console error |
| R10 | BUS | A UI translation is missing or a `{placeholder}` is lost | 2 | 1 | 2 | `i18n.test.js` |
| R11 | BUS | Visual regressions on the canvas (colors, themes, sprite placement) | 2 | 1 | 2 | Not automated: check `tools/gallery.html` by hand |

## Test levels

The rule from the Test Levels framework: **use the lowest level that can catch
the bug**, and don't cover the same thing twice at two levels unless it's a
P0 path that needs both.

| Level | Tool | What belongs here | Files |
|---|---|---|---|
| **Unit (pure)** | Vitest, Node | Number words, suffixes, place values, phrase builders, clip-manifest coverage, art grid checks, settings merging, i18n keys | `numbers`, `phrases`, `characters`, `i18n` tests |
| **Unit (DOM)** | Vitest + jsdom (`// @vitest-environment jsdom`) | One module with its real markup and stubbed browser APIs: `Speech` voice choice, `NumberGame` on the real `#dlg-numbers` markup from `index.html`, `SpriteBank` masks, `localStorage` | `speech`, `numbergame`, `sprites`, `storage` tests |
| **E2E** | Cypress (Electron, headless) | User journeys across modules in a real browser: boot, keyboard vs dialogs, a full number game round, crash → score card, picker persistence, which voice actually plays | `cypress/e2e/*.cy.js` |

What does **not** go in e2e: number words, chain rules, phrase coverage. Those
are checked exhaustively in unit tests. E2E checks one representative case and
the wiring (for example, that the score card reads 387 with a clip).

Why **Vitest**: the source is plain ES modules and Vitest runs them unchanged.
jsdom can be enabled per file, fake timers are built in, and `vi.stubGlobal`
makes browser stubs easy. `node:test` would work for the pure modules, but the
DOM-level tests would then need their own jsdom wiring and timer mocking.

Why **Cypress** (the user asked for it; bmad-tea defaults to Playwright for
large repos): for one page and one developer, Cypress's interactive runner and
automatic retrying assertions are the simpler choice.

## Priorities

| Priority | Meaning here | Tests |
|---|---|---|
| **P0** | The core learning experience, or something that broke before | Number words; the voice choice (clips vs browser voice, the manifest race); phrase/clip coverage; the number game's wrong-answer flow, rewards and final screen; Space vs dialogs; the page boots without errors |
| **P1** | Main journeys and data | Score card after a crash, the breakdown, settings persistence (character, theme, voice), question generation rules, collisions and masks, art integrity |
| **P2** | Secondary | i18n completeness, unused clips, layout order |
| **P3** | Nice to have | Visuals (manual, `tools/gallery.html`) |

**Gate:** the whole suite runs in under a minute, so run all of it before every
push (`npm run test:all`). P0 must be 100% green. There are no retries
(`retries: 0`): a flaky test is a bug to fix, not to retry.

## Conventions

### Layout and naming

```
tests/unit/<module>.test.js         one file per src module
tests/unit/support/fakes.js         pure helpers: seeded random, audio/speech stubs, repo file access
tests/unit/support/numbergame-fixture.js
cypress/e2e/<journey>.cy.js         one file per journey
cypress/support/e2e.js              browser stubs + commands (visitGame, pressSpace, endRun, heard)
scripts/serve.mjs                   static server for e2e
```

Test names describe behaviour in plain words ("a wrong answer counts all
pictures together, then asks again"), not implementation details.

### Selectors

bmad-tea's order of preference is data-testid > ARIA > text > CSS. In this
project the app's own JavaScript already selects elements by ids and `data-*`
attributes, so those hooks can't change without breaking the app, and they
come first:

1. **Ids and `data-*` hooks the app itself uses**: `#btn-numbers`,
   `#btn-customize`, `[data-theme-id=night]`, `[data-character-id=chubby]`,
   `[data-action=breakdown]`, `[name=learnVoice]`.
2. **ARIA state and names**: `aria-pressed` for the pickers, the reward
   counter's `aria-label` ("3 of 5 …"), `role`.
3. **`data-testid`, only where there's no stable hook.** Currently two:
   `data-testid="ng-reward"` (the reward counter in the number game header) and
   `data-testid="ng-done-reward"` (the rewards on the final screen). The
   counter has already been renamed once (stars → mangoes), which is exactly
   why it needed a hook that isn't tied to its name.
4. **Classes, only when the module's own code queries them** (`.ng-option`,
   `.ng-item`, `.ng-done`). Never styling-only classes, and never `nth-child`
   for meaning.
5. **Text**, only when the text is what's being tested: the number words, or
   the number on an answer button.

Tests about the number game reward assert the **count**, not the reward's name
or emoji (stars, mangoes…).

### Fixtures and helpers

Following the Fixture Architecture guidance: pure functions first, wrapped
for each framework, and no page-object inheritance.

- `fakes.js`: `seededRandom`/`seedMath`, `stubAudioAndSpeech()` (Audio,
  speechSynthesis, fetch for the manifest, with an optional delay),
  `recordingSpeech()` for components, and `manifest()`.
- `numbergame-fixture.js` builds a `NumberGame` on the real dialog markup
  parsed from `index.html`, so if a class is renamed in both the page and the
  module, the tests follow without changes. `openWith(questions)` swaps in
  fixed questions with a spy, without touching internal fields.
- Cypress: stubs are installed on **every** page load
  (`Cypress.on('window:before:load')`), including `cy.reload()`. Commands are
  `cy.visitGame(path, { settings, waitForClips })`, `cy.pressSpace()`,
  `cy.endRun(score)` and `cy.heard()`.
- Reuse rule: extract a helper once it's used 2–3 times; otherwise keep it in
  the test.

### Stubs: speech, audio, time, randomness

- **Voice clips**: `HTMLMediaElement.prototype.play` is replaced by a recorder
  that "ends" after 10 ms, and mp3 requests are stubbed. Tests then check the
  exact clip files expected from the real `audio/tr/manifest.json`.
- **Browser voice**: `speechSynthesis` and `SpeechSynthesisUtterance` are
  replaced. Utterances are recorded (`text`, `voice`, `lang`) and finish right
  away. The fake voices are `Yelda` (tr-TR) and `Samantha` (en-US), with
  voiceURIs `test:Yelda` and `test:Samantha`.
- **Motion**: `prefers-reduced-motion` is forced on, so the swap animation
  happens instantly.
- **Time**: unit tests use fake timers. E2E tests never use `cy.wait(ms)`:
  they wait on a condition (an element, an attribute, `performance.now() -
  game.crashedAt`). Runs are ended with `cy.endRun(score)` instead of playing.
- **Randomness**: unit tests use the seeded `Math.random`. E2E tests use fixed
  questions, and click "any wrong option" rather than a particular number,
  because the distractor options are random.
- **Network-first**: the manifest is intercepted and aliased before
  `cy.visit` (`@manifest`), and tests wait on it before checking the voice.
  The race regression test deliberately delays the manifest by 1.5 s.
- **Console errors**: every e2e test fails if the page logged a
  `console.error`, and Cypress also fails on uncaught exceptions.

### Definition of done for a test

From bmad-tea's test-quality checklist: no hard waits, no `if`/`try` flow
control in tests, assertions visible in the test body, under ~300 lines per
file, each test independent (Cypress clears storage between tests, and unit
tests restore mocks), and deterministic. A test that fails once in a while
must be fixed, not retried.

## bmad-tea guidance: applied vs. skipped

| Guidance | Applied? | Why |
|---|---|---|
| Risk-based testing, P×I matrix, high scores (≥ 6) must be mitigated | Applied | The table above; every score ≥ 6 has tests. |
| Test Design: testability review (controllability, observability, reliability) | Applied | "Testability review" section. |
| Test levels framework: lowest level first, guard against duplicate coverage | Applied | Exhaustive logic in unit tests; e2e covers wiring and journeys. |
| P0–P3 priorities | Applied, with the criteria adapted | "Revenue/security" doesn't apply here. P0 is the learning experience plus anything that broke before. |
| Test quality DoD (deterministic, isolated, no hard waits, explicit assertions) | Applied | Seeded random, fake timers, condition waits, `retries: 0`. |
| Network-first (intercept before navigate, deterministic waits) | Applied | Manifest alias, stubbed mp3s, delayed manifest for the race. |
| Selector resilience hierarchy | Applied, adapted | Existing app hooks first, two `data-testid`s where needed (see "Selectors"). |
| Fixture architecture: pure functions → framework wrappers, no page objects | Applied, lightly | `fakes.js` + Cypress commands. No `mergeTests` layer, since there's only one fixture concern per framework. |
| Network error monitor | Partially | A console-error guard on every e2e test, plus boot detection. No per-request 4xx monitor: a broken module already stops the app from booting. |
| Framework scaffold: `.env.example`, `.nvmrc`, HTML + JUnit reporters, sharding, parallel workers, CI tuning | Skipped | No CI, no environments, one developer. The suite runs in under a minute locally. Easy to add if the game gets a CI job. |
| Playwright Utils, data factories with faker, API seeding, auth sessions | Skipped | No backend, no accounts, no generated user data. The only "data" is settings in `localStorage`. |
| Contract testing (Pact), NFR assessment, burn-in, trace matrix, quality-gate YAML | Skipped | No services or SLAs; the ceremony would cost more than the risks it covers. The risk table doubles as the trace from risk to test. |
| Given/When/Then format | Skipped | Short behaviour-style test names read better for this size. |
| Coverage target ≥ 80% | Skipped | Coverage would be dominated by canvas rendering code with little risk. The risk table drives coverage instead. |
| Prefer Playwright for browser tests | Overridden | The user asked for Cypress, which fits a small one-page app. |

## Known gaps and findings

- **Manifest race (R1)**: `speech.test.js` › "before the clip manifest has
  loaded" and `voice.cy.js` › "reads 0 with a clip even when the clip
  manifest arrives late" describe the expected behaviour. They fail until the
  fix in `speech.js` lands.
- `NumberGame.chain()` can create a sum above the limit when `maxNumber` is
  below 3 (for example 1 + 2 with a limit of 2). The UI only offers 5, 10 and
  20, so this can't happen today; worth guarding if smaller limits are ever
  added.
- Not automated: touch input (tap to jump, hold to duck), canvas visuals and
  themes, screenshot and share buttons, background image upload, and the
  mobile layout. If the game goes mobile, add a Cypress spec at a phone
  viewport for touch start/duck and the number game layout.

## Adding a test

1. Find the risk it covers (add a row above if it's new) and give it a
   priority.
2. Pick the lowest level that can catch the bug: pure unit, then DOM unit,
   then e2e.
3. Reuse the helpers in `tests/unit/support/` or `cypress/support/e2e.js`, and
   select elements following the order under "Selectors".
4. Make it deterministic (seed, fixed questions, condition waits), and run it a
   few times before trusting it.
