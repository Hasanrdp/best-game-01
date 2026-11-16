// EMBERLINE — synthesized sound: every effect and the music loop are built
// from WebAudio oscillators and noise, so the game ships zero audio files.
// Audio starts only after the first user gesture (browser policy).
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    // A minor-key ember groove: A C D E G, slow and low.
    this.bassNotes = [55, 55, 65.41, 49];
    this.melodyNotes = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63];
  }

  // Call from a user gesture (click / keydown). Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.master);
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  shoot() { this._tone(720 + Math.random() * 120, 0.07, 'square', 0.05, 240); }
  enemyHit() { this._tone(180, 0.05, 'triangle', 0.08, 90); }
  enemyDie() {
    this._noise(0.22, 0.16, 1400);
    this._tone(320, 0.18, 'sawtooth', 0.07, 60);
  }
  playerHurt() {
    this._noise(0.3, 0.22, 900);
    this._tone(140, 0.3, 'sawtooth', 0.12, 45);
  }
  dash() { this._noise(0.14, 0.1, 3200); }
  pickup() { this._tone(660, 0.09, 'sine', 0.12, 990); }
  heal() { this._tone(523, 0.12, 'sine', 0.12, 784); this._tone(784, 0.16, 'sine', 0.1, 1046); }
  nova() {
    this._noise(0.5, 0.25, 2400);
    this._tone(220, 0.5, 'sine', 0.14, 55);
  }
  waveHorn() {
    this._tone(196, 0.35, 'triangle', 0.14, 196);
    this._tone(294, 0.35, 'triangle', 0.1, 294);
  }
  upgradePick() {
    this._tone(523, 0.1, 'sine', 0.12, 523);
    this._tone(659, 0.1, 'sine', 0.12, 659);
    this._tone(784, 0.18, 'sine', 0.12, 784);
  }
  bossRoar() {
    this._tone(82, 0.7, 'sawtooth', 0.16, 41);
    this._noise(0.6, 0.18, 500);
  }
  gameOver() {
    this._tone(392, 0.4, 'triangle', 0.12, 370);
    this._tone(311, 0.4, 'triangle', 0.12, 294);
    this._tone(233, 0.8, 'triangle', 0.12, 220);
  }
  victory() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.35, 'triangle', 0.12, f), i * 130);
    });
  }

  startMusic() {
    if (this.musicTimer) return;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const bar = Math.floor(this.musicStep / 4) % this.bassNotes.length;
      const step = this.musicStep % 4;
      if (step === 0) this._musicNote(this.bassNotes[bar], 0.5, 'triangle', 0.5);
      if (step === 2) this._musicNote(this.bassNotes[bar] / 2, 0.4, 'sine', 0.4);
      if (this.musicStep % 2 === 0) {
        const m = this.melodyNotes[(this.musicStep / 2) % this.melodyNotes.length];
        this._musicNote(m, 0.22, 'sine', 0.16);
      }
      this.musicStep += 1;
    }, 300);
  }

  _musicNote(freq, dur, type, vol) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
