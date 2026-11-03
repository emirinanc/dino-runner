// The card under the game that shows the score as a big, readable number with
// its words, reads it aloud, and (for parents) breaks it into place values.

import { PLACE_COLORS, placeValues, learnLang, placeLabel, placeSentence, numberSentence, breakdownScript } from './numbers.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// --- base-ten blocks as SVG -----------------------------------------------------

function gridSvg(cols, rows, cell, color) {
  const w = cols * cell;
  const h = rows * cell;
  let lines = '';
  for (let x = 1; x < cols; x++) lines += `<line x1="${x * cell}" y1="0" x2="${x * cell}" y2="${h}"/>`;
  for (let y = 1; y < rows; y++) lines += `<line x1="0" y1="${y * cell}" x2="${w}" y2="${y * cell}"/>`;
  return `<svg width="${w + 2}" height="${h + 2}" viewBox="-1 -1 ${w + 2} ${h + 2}" aria-hidden="true">
    <rect width="${w}" height="${h}" fill="${color}" stroke="rgb(0 0 0 / .45)" stroke-width="1.5" rx="1"/>
    <g stroke="rgb(255 255 255 / .55)" stroke-width="1">${lines}</g></svg>`;
}

function cubeSvg(size, color) {
  const s = size;
  const d = s * 0.35; // depth offset
  return `<svg width="${s + d + 2}" height="${s + d + 2}" viewBox="-1 -1 ${s + d + 2} ${s + d + 2}" aria-hidden="true">
    <g stroke="rgb(0 0 0 / .45)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="0,${d} ${d},0 ${s + d},0 ${s},${d}" fill="${color}" style="filter:brightness(1.25)"/>
      <polygon points="${s},${d} ${s + d},0 ${s + d},${s} ${s},${s + d}" fill="${color}" style="filter:brightness(.8)"/>
      <rect x="0" y="${d}" width="${s}" height="${s}" fill="${color}"/>
    </g></svg>`;
}

const BLOCKS = {
  ones: (c) => gridSvg(1, 1, 18, c),
  tens: (c) => gridSvg(1, 10, 7, c),
  hundreds: (c) => gridSvg(10, 10, 7, c),
  thousands: (c) => cubeSvg(46, c),
  tenThousands: (c) => cubeSvg(58, c),
  hundredThousands: (c) => cubeSvg(70, c),
};

// --------------------------------------------------------------------------------

export class ScoreCard {
  /**
   * @param {HTMLElement} root  the #score-card section
   * @param {{ speech, settings, t }} deps
   */
  constructor(root, { speech, settings, t }) {
    this.root = root;
    this.speech = speech;
    this.settings = settings;
    this.t = t;
    this.score = 0;
    this.q = (sel) => root.querySelector(sel);

    this.q('[data-action=read]').addEventListener('click', () => this.read());
    this.q('[data-action=breakdown]').addEventListener('click', () => this.toggleBreakdown());
    this.q('[data-action=explain]').addEventListener('click', () => this.explain());
  }

  get lang() {
    return this.settings.learning.lang;
  }

  show(score, { speak = false } = {}) {
    this.speech.cancel();
    this.score = score;
    this.root.hidden = false;
    this.renderNumber();
    if (!this.q('.breakdown').hidden) this.renderBreakdown();
    this.updateVoiceWarning();
    if (speak) this.read();
  }

  hide() {
    this.root.hidden = true;
    this.speech.cancel();
    this.highlight(null);
  }

  /** Re-render after a language / settings change. */
  refresh() {
    if (!this.root.hidden) this.show(this.score);
  }

  renderNumber() {
    const box = this.q('.big-number');
    box.replaceChildren();
    for (const p of placeValues(this.score)) {
      const span = el('span', 'digit', String(p.digit));
      span.dataset.place = p.place;
      if (this.settings.learning.coloredDigits) span.style.color = PLACE_COLORS[p.place];
      box.append(span);
    }
    this.q('.number-words').textContent = learnLang(this.lang).words(this.score);
  }

  toggleBreakdown() {
    const view = this.q('.breakdown');
    view.hidden = !view.hidden;
    if (!view.hidden) {
      this.renderBreakdown();
      this.explain();
    } else {
      this.speech.cancel();
    }
  }

  renderBreakdown() {
    const L = learnLang(this.lang);
    const parts = placeValues(this.score);

    const places = this.q('.places');
    places.replaceChildren();
    for (const p of parts) {
      const color = PLACE_COLORS[p.place];
      const col = el('button', 'place');
      col.type = 'button';
      col.dataset.place = p.place;
      col.style.setProperty('--c', color);
      const blocks = el('span', 'blocks');
      blocks.innerHTML = BLOCKS[p.place](color).repeat(p.digit);
      col.append(
        el('span', 'place-name', placeLabel(this.lang, p)),
        el('span', 'place-digit', String(p.digit)),
        blocks,
        el('span', 'place-value', String(p.value)),
        el('span', 'place-words', L.words(p.value)),
      );
      col.addEventListener('click', () => {
        this.highlight(p.place);
        this.speech.say(placeSentence(this.lang, p), this.lang).then(() => this.highlight(null));
      });
      places.append(col);
    }

    // 300 + 40 + 7 = 347
    const eq = this.q('.equation');
    eq.replaceChildren();
    const nonZero = parts.filter((p) => p.digit);
    (nonZero.length ? nonZero : parts).forEach((p, i) => {
      if (i) eq.append(el('span', 'op', '+'));
      const v = el('span', 'term', String(p.value));
      v.style.color = PLACE_COLORS[p.place];
      eq.append(v);
    });
    eq.append(el('span', 'op', '='), el('b', 'total', String(this.score)));
    this.q('.equation-words').textContent =
      `${(nonZero.length ? nonZero : parts).map((p) => L.words(p.value)).join(` ${L.plus} `)} ${L.equals} ${L.words(this.score)}`;
  }

  read() {
    this.highlight('number');
    return this.speech.say(numberSentence(this.lang, this.score), this.lang).then(() => this.highlight(null));
  }

  /** Narrates the breakdown step by step, highlighting each column as it's read. */
  explain() {
    const steps = breakdownScript(this.score, this.lang).map((s) => ({
      text: s.text,
      pieces: s.pieces,
      onStart: () => this.highlight(s.place ?? 'number'),
    }));
    return this.speech.say(steps, this.lang).then(() => this.highlight(null));
  }

  highlight(place) {
    for (const e of this.root.querySelectorAll('.active')) e.classList.remove('active');
    if (!place) return;
    if (place === 'number') this.q('.big-number').classList.add('active');
    else if (place === 'all') this.q('.equation-box').classList.add('active');
    else this.root.querySelectorAll(`[data-place="${place}"]`).forEach((e) => e.classList.add('active'));
  }

  updateVoiceWarning() {
    const warn = this.q('.voice-warning');
    const missing = this.speech.supported && this.speech.voices.length > 0 && !this.speech.hasVoice(this.lang);
    warn.hidden = !missing && this.speech.supported;
    warn.textContent = this.t('noVoice', { lang: learnLang(this.lang).name });
  }
}
