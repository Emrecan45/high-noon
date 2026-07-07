function storedVolume(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  const value = Number(raw);
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.sfxVolume = storedVolume("hn-sfx-vol", 0.9);
    this.musicVolume = storedVolume("hn-music-vol", 0.45);
  }

  ensure() {
    if (this.ctx === null) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createBiquadFilter();
      this.master.type = "lowpass";
      this.master.frequency.value = 20000;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  muffle(active) {
    this.ensure();
    let target = 20000;
    if (active) {
      target = 620;
    }
    this.master.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.07);
  }

  setSfxVolume(value) {
    this.sfxVolume = value;
    localStorage.setItem("hn-sfx-vol", String(value));
    if (this.sfxGain !== null) {
      this.sfxGain.gain.value = value;
    }
  }

  setMusicVolume(value) {
    this.musicVolume = value;
    localStorage.setItem("hn-music-vol", String(value));
    if (this.musicGain !== null) {
      this.musicGain.gain.value = value;
    }
  }

  now() {
    return this.ctx.currentTime;
  }

  envGain(start, peak, duration) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    g.connect(this.sfxGain);
    return g;
  }

  noiseBuffer(duration) {
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, rate * duration, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  bell() {
    this.ensure();
    const t = this.now();
    const freqs = [880, 1244, 1760];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freqs[i];
      const g = this.envGain(t, 0.28 / (i + 1), 1.4);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 1.5);
    }
  }

  gunshot() {
    this.ensure();
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.4);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.35);
    const g = this.envGain(t, 0.85, 0.4);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    const boom = this.ctx.createOscillator();
    boom.type = "triangle";
    boom.frequency.setValueAtTime(120, t);
    boom.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const bg = this.envGain(t, 0.5, 0.3);
    boom.connect(bg);
    boom.start(t);
    boom.stop(t + 0.35);
  }

  distantShot() {
    this.ensure();
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const g = this.envGain(t, 0.4, 0.35);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
  }

  dryClick() {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 2200;
    const g = this.envGain(t, 0.15, 0.05);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  reloadClick(step) {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 1400 + step * 300;
    const g = this.envGain(t, 0.12, 0.06);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  ricochet() {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.28);
    const g = this.envGain(t, 0.14, 0.3);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  whoosh() {
    this.ensure();
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.35);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    const g = this.envGain(t, 0.25, 0.35);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
  }

  crow() {
    this.ensure();
    const t = this.now();
    for (let i = 0; i < 2; i++) {
      const start = t + i * 0.22;
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(950, start);
      osc.frequency.exponentialRampToValueAtTime(480, start + 0.16);
      const g = this.envGain(start, 0.09, 0.18);
      osc.connect(g);
      osc.start(start);
      osc.stop(start + 0.2);
    }
  }

  bang() {
    this.ensure();
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.25);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    const g = this.envGain(t, 0.3, 0.25);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    const knock = this.ctx.createOscillator();
    knock.type = "triangle";
    knock.frequency.setValueAtTime(180, t);
    knock.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const kg = this.envGain(t, 0.25, 0.15);
    knock.connect(kg);
    knock.start(t);
    knock.stop(t + 0.18);
  }

  reveal() {
    this.ensure();
    const t = this.now();
    const notes = [110, 103.8];
    for (let i = 0; i < notes.length; i++) {
      const start = t + i * 0.24;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      const g = this.envGain(start, 0.35, 0.4);
      osc.connect(g);
      osc.start(start);
      osc.stop(start + 0.45);
    }
    const rattle = this.ctx.createBufferSource();
    rattle.buffer = this.noiseBuffer(0.7);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 5200;
    filter.Q.value = 2;
    const rg = this.ctx.createGain();
    rg.gain.value = 0.0001;
    rg.connect(this.sfxGain);
    const lfo = this.ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 15;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(rg.gain);
    rattle.connect(filter);
    filter.connect(rg);
    rattle.start(t);
    lfo.start(t);
    lfo.stop(t + 0.7);
  }

  wind() {
    this.ensure();
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(3.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.linearRampToValueAtTime(720, t + 1.6);
    filter.frequency.linearRampToValueAtTime(280, t + 3.2);
    filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.8);
    g.gain.linearRampToValueAtTime(0.12, t + 2.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 3.2);
    g.connect(this.sfxGain);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
  }

  duelBell() {
    this.ensure();
    const t = this.now();
    const freqs = [196, 293.66, 98];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freqs[i];
      const g = this.envGain(t, 0.34 / (i + 1), 2.4);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 2.6);
    }
  }

  step() {
    this.ensure();
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.12);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 480;
    const g = this.envGain(t, 0.38, 0.12);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    const knock = this.ctx.createOscillator();
    knock.type = "sine";
    knock.frequency.setValueAtTime(140, t);
    knock.frequency.exponentialRampToValueAtTime(58, t + 0.1);
    const kg = this.envGain(t, 0.34, 0.12);
    knock.connect(kg);
    knock.start(t);
    knock.stop(t + 0.14);
  }

  footsteps() {
    this.step();
    const self = this;
    setTimeout(function () {
      self.step();
    }, 260);
  }

  spurs() {
    this.ensure();
    const t = this.now();
    for (let i = 0; i < 3; i++) {
      const start = t + i * 0.08;
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 2400 + i * 220;
      const g = this.envGain(start, 0.05, 0.09);
      osc.connect(g);
      osc.start(start);
      osc.stop(start + 0.1);
    }
  }

  duelSting() {
    this.ensure();
    const t = this.now();
    const notes = [146.83, 220, 174.61];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = notes[i];
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1100;
      const g = this.envGain(t, 0.14, 1.2);
      osc.connect(filter);
      filter.connect(g);
      osc.start(t);
      osc.stop(t + 1.3);
    }
    const boom = this.ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(80, t);
    boom.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    const bg = this.envGain(t, 0.5, 0.6);
    boom.connect(bg);
    boom.start(t);
    boom.stop(t + 0.7);
  }

  uiClick() {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(560, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    const g = this.envGain(t, 0.1, 0.06);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  coin() {
    this.ensure();
    const t = this.now();
    const notes = [1318, 1760];
    for (let i = 0; i < notes.length; i++) {
      const start = t + i * 0.07;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      const g = this.envGain(start, 0.16, 0.25);
      osc.connect(g);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  }

  equip() {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(170, t + 0.08);
    const g = this.envGain(t, 0.13, 0.1);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  wheelWin() {
    this.ensure();
    const t = this.now();
    const notes = [523, 659, 784, 1046, 1318];
    for (let i = 0; i < notes.length; i++) {
      const start = t + i * 0.09;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      const g = this.envGain(start, 0.2, 0.38);
      osc.connect(g);
      osc.start(start);
      osc.stop(start + 0.42);
    }
  }

  thud() {
    this.ensure();
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    const g = this.envGain(t, 0.5, 0.25);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  victory() {
    this.ensure();
    const t = this.now();
    const notes = [523, 659, 784, 1046];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      const g = this.envGain(t + i * 0.16, 0.22, 0.4);
      osc.connect(g);
      osc.start(t + i * 0.16);
      osc.stop(t + i * 0.16 + 0.45);
    }
  }

  defeat() {
    this.ensure();
    const t = this.now();
    const notes = [392, 330, 262, 196];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      const g = this.envGain(t + i * 0.22, 0.2, 0.5);
      osc.connect(g);
      osc.start(t + i * 0.22);
      osc.stop(t + i * 0.22 + 0.55);
    }
  }
}
