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
| **Toolbar** | Nickname · Sound on/off · Zoom (1×, 1.5×, 2×, 3×) · Screenshot (downloads a PNG) · Customize · Embed code · Language (English, Português (Brasil), 日本語, Español) |
| **Scores** | High score, top 5 of the day and top 5 of all time, stored locally in your browser. The score flashes and beeps every 100 points. |
| **Share** | Native share sheet (on mobile), X, Facebook, WhatsApp, Telegram, copy link |
| **Customize** | Theme · background (theme default, solid color, or an uploaded image with cover/tile/stretch, parallax scroll and opacity) · dino, obstacle and ground colors · day/night cycle · speed multiplier · invincible practice mode |

URL options: `?theme=night`, `?embed=1` (game only, for iframes), `?bot=1` (autopilot).

The game object is exposed as `window.game` for tinkering in the dev console, e.g. `game.speed = 20` or `game.settings.invincible = true`.

## Project layout

```
index.html            page markup (toolbar, dialogs, leaderboards)
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
  ui.js               toolbar, overlay, dialogs, leaderboards, share, screenshot
  input.js            keyboard / mouse / touch
  audio.js            synthesized sound effects (Web Audio)
  storage.js          settings + scores in localStorage
  i18n.js             UI translations
  bot.js              autopilot (?bot=1)
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

## Notes

- Leaderboards and the high score are stored only in your browser's localStorage. A shared, global leaderboard or "playing now" counter would need a small backend; `recordScore()` / `topScores()` in `src/storage.js` are the place to connect one.
- Scores aren't recorded while invincible or when the speed multiplier isn't 1×.
- Uploaded background images are downscaled and saved with your settings. A very large image may not fit in localStorage, and the game will tell you if that happens.

## License

MIT
