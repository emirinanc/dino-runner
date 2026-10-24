// Everything around the canvas: toolbar, overlay messages, theme picker,
// leaderboards, sharing and the Customize / Nickname / Embed dialogs.

import { CONFIG } from './config.js';
import { THEMES } from './themes.js';
import { t, setLanguage } from './i18n.js';
import { DEFAULT_SETTINGS, saveSettings, saveHighScore, recordScore, topScores, clearScores } from './storage.js';

const ZOOMS = [1, 1.5, 2, 3];
const $ = (id) => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches;

export class UI {
  constructor(game, settings, sound) {
    this.game = game;
    this.settings = settings;
    this.sound = sound;
  }

  init() {
    this.buildThemeButtons();
    this.bindToolbar();
    this.bindCustomize();
    this.bindNickname();
    this.bindEmbed();
    this.bindShare();
    this.bindHalloween();

    this.game.addEventListener('statechange', () => this.updateOverlay());
    this.game.addEventListener('gameover', (e) => this.onGameOver(e.detail));
    this.game.addEventListener('palette', (e) => this.applyPageColors(e.detail));

    window.addEventListener('resize', () => this.fit());
    this.refresh();
  }

  /** Re-renders everything that depends on settings or language. */
  refresh() {
    setLanguage(this.settings.lang);
    $('lang').value = this.settings.lang;
    $('sound-icon').textContent = this.settings.sound ? '🔊' : '🔇';
    $('zoom-label').textContent = `${this.settings.zoom}x`;
    $('nickname-label').textContent = this.settings.nickname || t('nickname');
    for (const btn of document.querySelectorAll('[data-theme-id]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeId === this.settings.theme));
    }
    this.fit();
    this.updateOverlay();
    this.renderBoards();
    this.updateHalloween();
  }

  save() {
    const ok = saveSettings(this.settings);
    this.game.settingsChanged();
    return ok;
  }

  // --- layout -----------------------------------------------------------------

  fit() {
    const available = $('play-area').clientWidth;
    const width = Math.min(CONFIG.width * this.settings.zoom, available);
    $('stage').style.width = `${width}px`; // the stage is a size container, so it needs an explicit width
    this.game.resize(width);
  }

  applyPageColors({ page, colors }) {
    const root = document.documentElement.style;
    root.setProperty('--bg', page.bg);
    root.setProperty('--fg', page.fg);
    root.setProperty('--accent', page.accent);
    root.setProperty('--game-text', colors.text);
  }

  updateOverlay() {
    const { state } = this.game;
    const title = $('overlay-title');
    const hint = $('overlay-hint');
    $('overlay').hidden = state === 'running';
    $('btn-restart').hidden = state !== 'over';
    $('overlay-note').hidden = !(state === 'over' && this.lastRun && !this.lastRun.recorded);
    title.textContent = { over: t('gameOver'), paused: t('paused') }[state] ?? '';
    title.hidden = !title.textContent;
    hint.textContent = {
      ready: isTouch() ? t('startTouch') : t('start'),
      paused: t('pausedHint'),
      over: t('restartHint'),
    }[state] ?? '';
  }

  // --- toolbar ----------------------------------------------------------------

  bindToolbar() {
    $('btn-sound').addEventListener('click', () => {
      this.settings.sound = !this.settings.sound;
      this.sound.enabled = this.settings.sound;
      this.save();
      this.refresh();
    });

    $('btn-zoom').addEventListener('click', () => {
      const i = ZOOMS.indexOf(this.settings.zoom);
      this.settings.zoom = ZOOMS[(i + 1) % ZOOMS.length];
      this.save();
      this.refresh();
    });

    $('btn-screenshot').addEventListener('click', () => this.screenshot());
    $('btn-restart').addEventListener('click', () => this.game.pressJump());

    $('lang').addEventListener('change', (e) => {
      this.settings.lang = e.target.value;
      this.save();
      this.refresh();
    });

    $('btn-clear-scores').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.confirm !== '1') {
        btn.dataset.confirm = '1';
        btn.textContent = `${t('clearScores')}?`;
        setTimeout(() => {
          btn.dataset.confirm = '';
          btn.textContent = t('clearScores');
        }, 3000);
        return;
      }
      clearScores();
      this.game.highScore = 0;
      btn.dataset.confirm = '';
      btn.textContent = t('clearScores');
      this.renderBoards();
    });
  }

  buildThemeButtons() {
    const box = $('themes');
    for (const [id, theme] of Object.entries(THEMES)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.dataset.themeId = id;
      btn.textContent = `${theme.icon ?? ''} ${theme.name}`.trim();
      btn.addEventListener('click', () => this.setTheme(id));
      box.append(btn);
    }
  }

  setTheme(id) {
    this.settings.theme = id;
    this.save();
    const url = new URL(location.href);
    url.searchParams.set('theme', id);
    history.replaceState(null, '', url);
    this.refresh();
    document.activeElement?.blur(); // so Space jumps instead of re-clicking the button
  }

  screenshot() {
    const src = this.game.canvas;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(src, 0, 0);
    if (this.game.state === 'over') {
      const s = out.width / CONFIG.width;
      ctx.fillStyle = this.game.palette.colors.text;
      ctx.textAlign = 'center';
      ctx.font = `bold ${14 * s}px ui-monospace, Menlo, Consolas, monospace`;
      ctx.fillText(t('gameOver'), out.width / 2, out.height * 0.42);
    }
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dino-runner-${this.game.score}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  // --- scores & sharing -------------------------------------------------------

  onGameOver({ score, highScore, recorded }) {
    this.lastRun = { score, recorded };
    if (recorded) {
      recordScore(this.settings.nickname, score);
      saveHighScore(highScore);
    }
    this.renderBoards();
    this.updateShare(score);
    this.updateOverlay();
  }

  renderBoards() {
    const { today, allTime } = topScores(5);
    const fill = (ol, list) => {
      ol.replaceChildren();
      if (!list.length) {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = t('noScores');
        ol.append(li);
        return;
      }
      for (const s of list) {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = s.name;
        const score = document.createElement('b');
        score.textContent = s.score;
        li.append(name, score);
        ol.append(li);
      }
    };
    fill($('board-today'), today);
    fill($('board-all'), allTime);
    $('personal-best').textContent = this.game.highScore;
  }

  shareUrl() {
    if (CONFIG.shareUrl) return CONFIG.shareUrl;
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('theme', this.settings.theme);
    return url.toString();
  }

  updateShare(score = this.lastRun?.score ?? 0) {
    const text = t('shareText', { score });
    const url = this.shareUrl();
    const enc = encodeURIComponent;
    $('share-x').href = `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`;
    $('share-fb').href = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
    $('share-wa').href = `https://wa.me/?text=${enc(`${text} ${url}`)}`;
    $('share-tg').href = `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
    this.shareText = text;
  }

  bindShare() {
    this.updateShare(0);
    const native = $('share-native');
    native.hidden = !navigator.share;
    native.addEventListener('click', () => {
      navigator.share({ title: t('title'), text: this.shareText, url: this.shareUrl() }).catch(() => {});
    });
    $('share-copy').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(`${this.shareText} ${this.shareUrl()}`);
        btn.textContent = t('copied');
        setTimeout(() => (btn.textContent = t('copyLink')), 1500);
      } catch {
        /* clipboard unavailable */
      }
    });
  }

  // --- dialogs ----------------------------------------------------------------

  openDialog(dlg) {
    this.game.pause();
    dlg.showModal();
  }

  bindNickname() {
    const dlg = $('dlg-nickname');
    const input = $('nickname-input');
    $('btn-nickname').addEventListener('click', () => {
      input.value = this.settings.nickname;
      this.openDialog(dlg);
    });
    dlg.querySelector('form').addEventListener('submit', (e) => {
      if (e.submitter?.value !== 'save') return;
      this.settings.nickname = input.value.trim().slice(0, 20);
      this.save();
      this.refresh();
    });
  }

  bindEmbed() {
    const dlg = $('dlg-embed');
    $('btn-embed').addEventListener('click', () => {
      const url = new URL(location.href);
      url.search = '';
      url.searchParams.set('embed', '1');
      url.searchParams.set('theme', this.settings.theme);
      $('embed-code').value =
        `<iframe src="${url}" width="600" height="170" style="border:0;max-width:100%" ` +
        `title="Dino Runner" loading="lazy"></iframe>`;
      this.openDialog(dlg);
      $('embed-code').select();
    });
  }

  bindCustomize() {
    const dlg = $('dlg-customize');
    const form = dlg.querySelector('form');
    const f = form.elements;

    const themeSelect = f.theme;
    for (const [id, theme] of Object.entries(THEMES)) themeSelect.add(new Option(theme.name, id));

    const load = () => {
      const s = this.settings;
      const c = s.custom;
      f.theme.value = s.theme;
      f.bgMode.value = c.bgMode;
      f.sky.value = c.sky ?? '#f7f7f7';
      f.imageMode.value = c.imageMode;
      f.imageScroll.checked = c.imageScroll;
      f.imageOpacity.value = c.imageOpacity;
      for (const key of ['dino', 'obstacle', 'ground']) {
        f[`${key}On`].checked = !!c[key];
        if (c[key]) f[key].value = c[key];
      }
      f.dayNightCycle.checked = s.dayNightCycle;
      f.speed.value = s.speed;
      f.invincible.checked = s.invincible;
      syncLabels();
    };

    const syncLabels = () => {
      $('speed-value').textContent = `${Number(f.speed.value)}×`;
      $('image-name').textContent = this.settings.custom.image ? '✓' : '';
      form.dataset.bg = f.bgMode.value;
    };

    const apply = () => {
      const s = this.settings;
      const c = s.custom;
      s.theme = f.theme.value;
      c.bgMode = f.bgMode.value;
      c.sky = f.sky.value;
      c.imageMode = f.imageMode.value;
      c.imageScroll = f.imageScroll.checked;
      c.imageOpacity = Number(f.imageOpacity.value);
      for (const key of ['dino', 'obstacle', 'ground']) c[key] = f[`${key}On`].checked ? f[key].value : null;
      s.dayNightCycle = f.dayNightCycle.checked;
      s.speed = Number(f.speed.value);
      s.invincible = f.invincible.checked;
      syncLabels();
      this.save();
      this.refresh();
    };

    form.addEventListener('input', (e) => {
      // picking a color implies you want to use it
      const key = e.target.name;
      if (['dino', 'obstacle', 'ground'].includes(key)) f[`${key}On`].checked = true;
      if (key === 'sky') f.bgMode.value = 'color';
      if (e.target.type !== 'file') apply();
    });

    f.image.addEventListener('change', async () => {
      const file = f.image.files[0];
      if (!file) return;
      this.settings.custom.image = await shrinkImage(file);
      f.bgMode.value = 'image';
      apply();
      if (!saveSettings(this.settings)) $('image-error').textContent = t('imageTooBig');
      else $('image-error').textContent = '';
      f.image.value = '';
    });

    $('btn-reset-custom').addEventListener('click', () => {
      Object.assign(this.settings, {
        dayNightCycle: DEFAULT_SETTINGS.dayNightCycle,
        speed: DEFAULT_SETTINGS.speed,
        invincible: DEFAULT_SETTINGS.invincible,
        custom: structuredClone(DEFAULT_SETTINGS.custom),
      });
      this.save();
      load();
      this.refresh();
    });

    $('btn-customize').addEventListener('click', () => {
      load();
      this.openDialog(dlg);
    });
  }

  // --- Halloween --------------------------------------------------------------

  bindHalloween() {
    $('btn-halloween').addEventListener('click', () => this.setTheme('halloween'));
  }

  updateHalloween() {
    const now = new Date();
    $('halloween-banner').hidden = !(now.getMonth() === 9 && this.settings.theme !== 'halloween');
  }
}

/** Downscales an uploaded image so it fits in localStorage. */
function shrinkImage(file, maxW = 1800, maxH = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      const webp = c.toDataURL('image/webp', 0.85);
      resolve(webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
