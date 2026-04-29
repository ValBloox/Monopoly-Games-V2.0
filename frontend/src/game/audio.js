// Web Audio API generative SFX engine
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.musicNodes = [];
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.bgAudio = null;
    this.diceRollAudio = null;
    this.diceResultAudio = {};
  }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // User-provided assets
      this.bgAudio = new Audio(`${process.env.PUBLIC_URL || ""}/sounds/monopoly-theme.mp3`);
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.28;
      this.bgAudio.preload = "auto";
      this.diceRollAudio = new Audio(`${process.env.PUBLIC_URL || ""}/sounds/dice-roll.mp3`);
      this.diceRollAudio.preload = "auto";
      this.diceRollAudio.volume = 0.55;
      for (let total = 2; total <= 12; total++) {
        const clip = new Audio(`${process.env.PUBLIC_URL || ""}/sounds/dice-results/${total}.mp3`);
        clip.preload = "auto";
        clip.volume = 0.82;
        this.diceResultAudio[total] = clip;
      }
    } catch (e) {
      console.warn("AudioContext not available", e);
    }
  }
  setMusic(on) { this.musicEnabled = on; if (!on) this.stopMusic(); else this.startMusic(); }
  setSfx(on) { this.sfxEnabled = on; }
  _ensure() { if (!this.ctx) this.init(); return !!this.ctx; }

  step() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 220; o.type = "square";
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.start(); o.stop(ctx.currentTime + 0.06);
  }
  diceRoll() {
    if (!this.sfxEnabled || !this._ensure()) return;
    if (this.diceRollAudio) {
      try {
        const clip = this.diceRollAudio.cloneNode();
        clip.volume = this.diceRollAudio.volume;
        clip.play().catch(() => {});
      } catch (e) {}
      return;
    }
    const ctx = this.ctx;

    // Dice rattle: decaying noise shaped into a narrow band, plus a few short impacts.
    const bs = Math.floor(ctx.sampleRate * 0.28);
    const buf = ctx.createBuffer(1, bs, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bs; i++) {
      const t = i / bs;
      const decay = Math.pow(1 - t, 2.2);
      // Add occasional spikes to mimic impacts.
      const spike = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 2.2 : 0;
      d[i] = ((Math.random() * 2 - 1) + spike) * decay;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start();

    // Extra "clicks" for the rattle.
    const baseT = ctx.currentTime;
    for (let k = 0; k < 5; k++) {
      const t = baseT + k * 0.03 + Math.random() * 0.015;
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "square";
      o.frequency.value = 1200 + Math.random() * 1400;
      og.gain.setValueAtTime(0.12, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      o.connect(og);
      og.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.04);
    }
  }
  land() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "triangle";
    o.frequency.setValueAtTime(180, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    o.start(); o.stop(ctx.currentTime + 0.1);
  }
  quizCorrect() {
    if (!this.sfxEnabled || !this._ensure()) return;
    this.coin();
  }
  quizWrong() {
    if (!this.sfxEnabled || !this._ensure()) return;
    this.payRent();
  }
  diceHit(intensity = 0.35) {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.max(0.03, Math.min(0.22, intensity * 0.18));

    const noiseLen = Math.floor(ctx.sampleRate * 0.045);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(now);

    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(260, now);
    o.frequency.exponentialRampToValueAtTime(120, now + 0.06);
    og.gain.setValueAtTime(vol * 0.7, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    o.connect(og);
    og.connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.07);
  }
  diceTotal(total) {
    try {
      if (!this.sfxEnabled || !this._ensure()) return;
      const clip = this.diceResultAudio?.[total];
      if (!clip) return;
      const speak = clip.cloneNode();
      speak.volume = clip.volume;
      speak.play().catch(() => {});
    } catch (e) {}
  }
  coin() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(900, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.25);
    o.type = "sine";
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  }
  stamp() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 90; o.type = "sawtooth";
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    o.start(); o.stop(ctx.currentTime + 0.13);
  }
  cardFlip() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(1300, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
    o.type = "triangle";
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    o.start(); o.stop(ctx.currentTime + 0.13);
  }
  victory() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const notes = [523, 659, 784, 1047, 1318];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = "square";
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.start(t); o.stop(t + 0.45);
    });
  }
  payRent() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.45);
    o.type = "sawtooth";
    g.gain.setValueAtTime(0.14, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    o.start(); o.stop(ctx.currentTime + 0.45);
  }
  jail() {
    if (!this.sfxEnabled || !this._ensure()) return;
    const ctx = this.ctx;
    [420, 320, 220].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = "square";
      const t = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t); o.stop(t + 0.22);
    });
  }
  startMusic() {
    if (!this.musicEnabled || !this._ensure()) return;
    if (this.bgAudio) {
      this.bgAudio.currentTime = 0;
      this.bgAudio.play().catch(() => {});
      return;
    }
    if (this.musicNodes.length) return;
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0.06;
    master.connect(ctx.destination);
    this.musicGain = master;
    // Drone with overtones — Am chord vintage feel
    [220, 261.63, 329.63, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = i === 3 ? "sine" : "triangle";
      g.gain.value = i === 3 ? 0.4 : 0.25;
      // Slow LFO for tremolo
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.2 + i * 0.07;
      lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      o.connect(g); g.connect(master);
      o.start(); lfo.start();
      this.musicNodes.push(o, lfo);
    });
  }
  stopMusic() {
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
      } catch (e) {}
    }
    this.musicNodes.forEach(n => { try { n.stop(); } catch (e) {} });
    this.musicNodes = [];
    if (this.musicGain) { try { this.musicGain.disconnect(); } catch (e) {} }
    this.musicGain = null;
  }
}

const audio = new AudioEngine();
export default audio;
