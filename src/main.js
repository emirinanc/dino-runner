import { Game } from './game.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { bindInput } from './input.js';
import { THEMES } from './themes.js';
import { detectLanguage } from './i18n.js';
import { loadSettings, saveSettings, loadHighScore } from './storage.js';

// URL options:
//   ?theme=night   start with a theme (also how the version buttons link)
//   ?embed=1       canvas only, for <iframe> embeds
//   ?bot=1         autopilot
const params = new URLSearchParams(location.search);

const settings = loadSettings();
settings.lang ??= detectLanguage();
if (THEMES[params.get('theme')]) settings.theme = params.get('theme');
saveSettings(settings);

if (params.has('embed')) document.body.classList.add('embed');

const sound = new Sound(settings.sound);
const game = new Game(document.getElementById('game'), {
  settings,
  sound,
  highScore: loadHighScore(),
  bot: params.has('bot'),
});
game.settingsChanged();

const ui = new UI(game, settings, sound);
ui.init();
bindInput(game, document.getElementById('play-area'));

// Expose for tinkering from the dev console: game.speed = 20, game.settings.invincible = true …
window.game = game;
window.ui = ui;
