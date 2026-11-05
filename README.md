# 🦖 Dino Runner

An ad-free, endless dino runner game in the spirit of the browser "no internet" game, built to be easy to modify.
It's plain HTML, CSS and JavaScript modules: no build step, no dependencies, no trackers.

All pixel art is stored as editable text in `src/characters.js` (the dinos) and `src/art.js` (obstacles, scenery, accessories). The T-Rex is based on the dinosaur of Chromium's offline game (BSD license, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)); everything else is original.

## Run it

ES modules need to be served over HTTP, so opening `index.html` directly from disk won't work. From the project folder:

```sh
npm start          # serves on http://localhost:8080 (uses python3)
# or
python3 -m http.server 8080
```

To deploy, copy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, …).

## Features

| | |
|---|---|
| **Controls** | Space / ↑ / W to jump (hold to jump higher) · ↓ / S to duck or fall faster · P / Esc to pause · Enter to restart. On touch screens, tap to jump and hold the bottom of the play area to duck. |
| **Versions** | Classic (with an automatic day/night cycle), Night, Color, Hero (cape and mask, city skyline), Jester, Dina (with a bow), Halloween (ghost dino, pumpkins, tombstones, bats). In October a banner suggests the Halloween version. |
| **Characters** | T-Rex (default) or Chubby. Whichever you pick takes on the version's colors and accessories; the buttons preview each character in the current version. |
| **Toolbar** | Number game · Sound on/off · Zoom (1×, 1.5×, 2×, 3×) · Screenshot (downloads a PNG) · Customize · Embed code · Language (English, Türkçe, Português (Brasil), 日本語, Español) |
| **Score** | Score digits are colored by place value. The high score is shown as HI. The score flashes and beeps every 100 points, and the number is spoken aloud ("yüz!", "iki yüz!"). |
| **Learning numbers** | When a run ends or you pause, a **score card** shows the score as a big number with its words ("387 → üç yüz seksen yedi") and reads it aloud. **🧩 Parçalara ayır / Break it down** splits it into place values (3 yüzlük · 8 onluk · 7 birlik) with base-ten blocks and "300 + 80 + 7 = 387", and narrates each step; tap any column to hear that part. **🎲 Sayı oyunu / Number game** is a side game of counting and addition with pictures from the current theme. Tapping a picture counts it aloud, every right answer earns a 🥭 mango (5 per round), and the first questions use the digits of the last score. A wrong answer doesn't just say "try again": the buttons lock and the game counts every picture together with the child, then asks again. Addition questions come in chains where each one changes the last in one way, so patterns can be noticed: the groups swap places (1 + 7 → 7 + 1, "Aynı!"), or one picture goes away or arrives (1 + 7 → 1 + 6, "Sekizden bir eksik!"). Solved equations stay in a row above the question. Numbers are in Turkish by default (English also available). |
| **Share** | Native share sheet (on mobile), X, Facebook, WhatsApp, Telegram, copy link |
| **Customize** | Theme · background (theme default, solid color, or an uploaded image with cover/tile/stretch, parallax scroll and opacity) · dino, obstacle and ground colors · day/night cycle · speed multiplier · invincible practice mode · learning: number language, voice (with a Listen button), read aloud, colored digits, number game limit (5 / 10 / 20) |

URL options: `?theme=night`, `?embed=1` (game only, for iframes), `?bot=1` (autopilot).

The game object is exposed as `window.game` for tinkering in the dev console, e.g. `game.speed = 20` or `game.settings.invincible = true`.

## Project layout

```
index.html            page markup (toolbar, score card, dialogs)
sw.js                 service worker: every load gets one version of every file
css/style.css         page styles; colors come from the active theme
src/
  main.js             bootstraps everything, reads URL options
  config.js           gameplay tuning: physics, speed, gaps, scoring, night cycle
  characters.js       the dino characters (T-Rex, Chubby) as text grids
  art.js              obstacles, scenery and accessories as text grids + palette character map
  themes.js           theme registry and color derivation / day-night mixing
  sprites.js          renders art grids to canvases; pixel-perfect collisions
  game.js             game loop, state machine, rendering, scoring
  entities/
    dino.js           player physics (jump, duck, fast fall, blink)
    obstacles.js      obstacle types + spawner
    scenery.js        sky, background image, sun/moon/stars, skyline, clouds, ground
  ui.js               toolbar, overlay, dialogs, share, screenshot
  input.js            keyboard / mouse / touch
  audio.js            synthesized sound effects (Web Audio)
  storage.js          settings + high score in localStorage
  i18n.js             UI translations
  bot.js              autopilot (?bot=1)
  learn/
    numbers.js        number words (Turkish, English), place values, spoken phrases
    phrases.js        every sentence the game can say (for the voice clips)
    speech.js         plays the voice clips, falls back to the browser's voices
    scorecard.js      score card: big number, words, read aloud, place-value breakdown
    numbergame.js     counting & addition side game
audio/tr/             natural voice clips + manifest.json (generated)
tools/gallery.html    preview every sprite in every theme
tools/voice/          generate.mjs: makes the voice clips with Google Cloud TTS
```

## Customizing

### Adding a theme

Add an entry to `THEMES` in `src/themes.js`. It shows up automatically in the version buttons, the Customize dialog and `?theme=<id>`:

```js
ocean: {
  name: 'Ocean',
  icon: '🌊',
  sky: { gradient: ['#0b3d91', '#69c3ff'] },   // or a single color '#rrggbb'
  colors: {
    bg: '#69c3ff', fg: '#06283d',              // everything not listed is derived from these
    body: '#ff8c42', belly: '#ffe0c2', accent: '#06283d',
    obstacle: '#2a9d8f', ground: '#f4e3b1', groundFill: '#e9c46a',
    cloud: '#ffffff', cloudFill: '#ffffff',
  },
  decor: { clouds: 1, sun: 1 },                // clouds, stars, moon, sun, skyline (0–1 = opacity)
  accessories: ['bow'],                        // see ACCESSORIES in art.js
  obstacles: { ground: ['cactusSmall'], air: ['bird'] },  // see OBSTACLE_TYPES
  nightTheme: 'night',                         // optional: fade to this theme every 700 points
  dinoAlpha: 1,                                // < 1 makes the dino see-through
  image: 'assets/ocean.png',                   // optional background image
  imageMode: 'cover',                          // 'cover' | 'tile' | 'stretch'
  page: { bg: '#e8f6ff', fg: '#06283d', accent: '#ff8c42' },  // colors of the page around the game
},
```

Every palette key and its default is listed in `deriveColors()` in `src/themes.js`.

### Changing or adding art

Sprites in `src/art.js` are arrays of strings. Each character is one pixel, and `CHAR_COLORS` maps characters to palette keys. For example, `X` → `body` and `O` → `obstacle`, and `.` is transparent. Edit a grid, reload `tools/gallery.html`, and you'll see the result in every theme.

- **New character:** add an entry to `CHARACTERS` in `src/characters.js` and a name for it in `src/i18n.js`; it shows up in the character picker. A character has a standing body (`stand`) and legs for standing and running, a ducking body (`duck`) with two leg frames, an eye position with open / blink / dead patterns, its pixel size (`px`: 1 for fine art like the T-Rex, 2 for chunky art), and `anchors` saying where each accessory sits in each pose.
- **New accessory** (hat, glasses, …): add a grid to `ACCESSORIES` in `src/art.js`, give it an anchor in every character, then list it in a theme's `accessories`.
- **New palette key:** add a character to `CHAR_COLORS`, give it a default in `deriveColors()`, and set it in your theme.

### Adding an obstacle

1. Draw it in `src/art.js` and register it in `ART`. For an animated obstacle, add one entry per frame.
2. Describe it in `OBSTACLE_TYPES` in `src/entities/obstacles.js`. Set `frames`, `minGap` and `minSpeed`, plus `maxGroup` for side-by-side groups or `altitudes` for flyers.
3. Add its id to a theme's `obstacles.ground` or `obstacles.air`.

Collisions are pixel-perfect against the art, so there are no hitboxes to maintain.

### Tuning gameplay

Change jump strength, gravity, speeds, obstacle gaps, scoring and the night cycle in `src/config.js`.

### Adding a language

Add a block to `STRINGS` in `src/i18n.js`, then add a matching `<option>` to the language `<select>` in `index.html`.

To make numbers readable and speakable in a new language, add an entry to `LEARN_LANGS` in `src/learn/numbers.js`. It needs a `words(n)` function, the place names and the spoken phrases. Then add it to the "Language for numbers" `<select>` in `index.html`.

### Voice clips

`src/learn/phrases.js` lists every sentence the game can say. After adding or changing a phrase, generate the missing clips:

```sh
node tools/voice/generate.mjs tr --dry     # count sentences and characters
node tools/voice/generate.mjs tr --prune   # generate new clips, delete unused ones
```

This calls Google Cloud Text-to-Speech with the API key in `~/.config/dino-runner/google-tts-key` (create a key restricted to the Text-to-Speech API; never commit it). Only new sentences are sent, and the voice and speed are set in `VOICES` at the top of the script.

### Changing the learning features

- **Place-value colors:** `PLACE_COLORS` in `src/learn/numbers.js`. They're used on the canvas, the score card and the blocks.
- **What's said aloud:** the phrases in `LEARN_LANGS`. The breakdown narration is built in `breakdownScript()`.
- **Number game:** round length, how questions are generated (`makeQuestions`) and the answer choices (`options`) are in `src/learn/numbergame.js`.

## Tests

The game itself needs no install; the tests do (`npm install` once).

```sh
npm test            # unit tests (Vitest): number words, phrases ↔ voice clips, speech, settings, characters, number game
npm run test:e2e    # Cypress, headless: dialogs and Space, number game rounds, score card, settings, voices
npm run test:all    # both
npm run test:e2e:open   # Cypress with its window, to watch or debug a test
```

What is tested where, and why, is in [docs/test-strategy.md](docs/test-strategy.md). Changed a phrase? `npm test` fails until its voice clip is generated (`node tools/voice/generate.mjs`).

## Notes

- The high score is stored only in your browser's localStorage, and isn't updated while invincible or when the speed multiplier isn't 1×.
- Turkish is spoken with **natural voice clips** (Google's "Puck" voice) that ship with the game in `audio/tr/`: every sentence the game can say, for number game sums up to 20 and scores up to 999. They work offline, and no API key is needed to play.
- Anything without a clip (bigger scores, English) is spoken by the browser's own voice. The game picks the best one it finds ("Natural", "Enhanced", "Premium" voices first), and you can choose another in Customize → Learning → Voice. On Mac, iPhone and iPad more voices are in Settings → Accessibility → Spoken Content → System Voice → Manage Voices. If no voice is found for the chosen number language, the score card says so.
- Phrases are written as full sentences with punctuation ("Üç yüzlük, yani üç yüz.") because voices take their intonation from it.
- Uploaded background images are downscaled and saved with your settings. A very large image may not fit in localStorage, and the game will tell you if that happens.

## License

MIT
