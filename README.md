# 🦖 Dino Runner

An ad-free, endless dino runner game in the spirit of the browser "no internet" game, built to be easy to modify.
It's plain HTML, CSS and JavaScript modules: no build step, no dependencies, no trackers.

All pixel art (the dino, obstacles and scenery) is original and stored as editable text in `src/art.js`.

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
| **Toolbar** | Number game · Sound on/off · Zoom (1×, 1.5×, 2×, 3×) · Screenshot (downloads a PNG) · Customize · Embed code · Language (English, Türkçe, Português (Brasil), 日本語, Español) |
| **Score** | Score digits are colored by place value. The high score is shown as HI. The score flashes and beeps every 100 points, and the number is spoken aloud ("yüz!", "iki yüz!"). |
| **Learning numbers** | When a run ends or you pause, a **score card** shows the score as a big number with its words ("387 → üç yüz seksen yedi") and reads it aloud. **🧩 Parçalara ayır / Break it down** splits it into place values (3 yüzlük · 8 onluk · 7 birlik) with base-ten blocks and "300 + 80 + 7 = 387", and narrates each step; tap any column to hear that part. **🎲 Sayı oyunu / Number game** is a side game of counting and addition with pictures from the current theme. Tapping a picture counts it aloud, there are 5 stars per round, and the first questions use the digits of the last score. Numbers are in Turkish by default (English also available). |
| **Share** | Native share sheet (on mobile), X, Facebook, WhatsApp, Telegram, copy link |
| **Customize** | Theme · background (theme default, solid color, or an uploaded image with cover/tile/stretch, parallax scroll and opacity) · dino, obstacle and ground colors · day/night cycle · speed multiplier · invincible practice mode · learning: number language, voice (with a Listen button), read aloud, colored digits, number game limit (5 / 10 / 20) |

URL options: `?theme=night`, `?embed=1` (game only, for iframes), `?bot=1` (autopilot).

The game object is exposed as `window.game` for tinkering in the dev console, e.g. `game.speed = 20` or `game.settings.invincible = true`.

## Project layout

```
index.html            page markup (toolbar, score card, dialogs)
css/style.css         page styles; colors come from the active theme
src/
  main.js             bootstraps everything, reads URL options
  config.js           gameplay tuning: physics, speed, gaps, scoring, night cycle
  art.js              ALL pixel art as text grids + palette character map
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
    speech.js         text-to-speech (Web Speech API)
    scorecard.js      score card: big number, words, read aloud, place-value breakdown
    numbergame.js     counting & addition side game
tools/gallery.html    preview every sprite in every theme
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

- **New character for the dino:** edit `DINO_TOP`, `LEGS`, `DUCK_TOP` and `DUCK_LEGS`. If the eye moves, update `EYE`.
- **New accessory** (hat, glasses, …): add it to `ACCESSORIES` with a grid and its position per pose (`stand`, `duck`), then list it in a theme's `accessories`.
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

### Changing the learning features

- **Place-value colors:** `PLACE_COLORS` in `src/learn/numbers.js`. They're used on the canvas, the score card and the blocks.
- **What's said aloud:** the phrases in `LEARN_LANGS`. The breakdown narration is built in `breakdownScript()`.
- **Number game:** round length, how questions are generated (`makeQuestions`) and the answer choices (`options`) are in `src/learn/numbergame.js`.

## Notes

- The high score is stored only in your browser's localStorage, and isn't updated while invincible or when the speed multiplier isn't 1×.
- Speech uses the voices installed on the device. On macOS, Chrome and Safari include a Turkish voice (Yelda). If no voice is found for the chosen number language, the score card says so.
- How natural it sounds depends mostly on the voice. The game picks the best one it finds ("Natural", "Enhanced", "Premium" voices first), and you can choose another in Customize → Learning → Voice. To get better voices on Mac, iPhone and iPad, go to Settings → Accessibility → Spoken Content → System Voice → Manage Voices (for Turkish, e.g. Cem). Microsoft Edge includes natural online voices (Turkish: Emel, Ahmet).
- Phrases are written as full sentences with punctuation ("Üç yüzlük, yani üç yüz.") because voices take their intonation from it.
- Uploaded background images are downscaled and saved with your settings. A very large image may not fit in localStorage, and the game will tell you if that happens.

## License

MIT
