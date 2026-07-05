export class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (this.ctx === null) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
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
    g.connect(this.ctx.destination);
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
