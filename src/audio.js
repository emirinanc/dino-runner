// Sound effects synthesized with the Web Audio API (no audio files needed).

export class Sound {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  /** Browsers only allow audio after a user gesture; call this from input handlers. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone({ from, to = from, duration = 0.08, type = 'square', volume = 0.06, delay = 0 }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  jump() {
    this.tone({ from: 480, to: 780, duration: 0.07 });
  }

  milestone() {
    this.tone({ from: 880, duration: 0.07 });
    this.tone({ from: 1320, duration: 0.1, delay: 0.08 });
  }

  crash() {
    this.tone({ from: 220, to: 60, duration: 0.25, type: 'sawtooth', volume: 0.08 });
  }
}
