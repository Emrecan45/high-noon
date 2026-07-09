import gunshotUrl from "./assets/audio/gunshot.wav";
import shotFarUrl from "./assets/audio/shot_far.ogg";
import bellSmallUrl from "./assets/audio/bell_small.ogg";
import bellChurchUrl from "./assets/audio/bell_church.ogg";
import bodyFallUrl from "./assets/audio/body_fall.ogg";
import ricochetPingUrl from "./assets/audio/ricochet_ping.ogg";
import clickDryUrl from "./assets/audio/click_dry.ogg";
import gunCockUrl from "./assets/audio/gun_cock.ogg";
import doorSlamUrl from "./assets/audio/door_slam.ogg";
import horseWhinnyUrl from "./assets/audio/horse_whinny.ogg";
import impactWoodUrl from "./assets/audio/impact_wood.ogg";
import impactGlassUrl from "./assets/audio/impact_glass.ogg";
import stepDirt0Url from "./assets/audio/step_dirt_0.ogg";
import stepDirt1Url from "./assets/audio/step_dirt_1.ogg";
import stepDirt2Url from "./assets/audio/step_dirt_2.ogg";
import stepDirt3Url from "./assets/audio/step_dirt_3.ogg";
import stepDirt4Url from "./assets/audio/step_dirt_4.ogg";
import stepWood0Url from "./assets/audio/step_wood_0.ogg";
import stepWood1Url from "./assets/audio/step_wood_1.ogg";
import stepWood2Url from "./assets/audio/step_wood_2.ogg";
import stepWood3Url from "./assets/audio/step_wood_3.ogg";
import stepWood4Url from "./assets/audio/step_wood_4.ogg";

const SAMPLE_URLS = {
  gunshot: gunshotUrl,
  shotFar: shotFarUrl,
  bellSmall: bellSmallUrl,
  bellChurch: bellChurchUrl,
  bodyFall: bodyFallUrl,
  ricochetPing: ricochetPingUrl,
  clickDry: clickDryUrl,
  gunCock: gunCockUrl,
  doorSlam: doorSlamUrl,
  horseWhinny: horseWhinnyUrl,
  impactWood: impactWoodUrl,
  impactGlass: impactGlassUrl,
  stepDirt0: stepDirt0Url,
  stepDirt1: stepDirt1Url,
  stepDirt2: stepDirt2Url,
  stepDirt3: stepDirt3Url,
  stepDirt4: stepDirt4Url,
  stepWood0: stepWood0Url,
  stepWood1: stepWood1Url,
  stepWood2: stepWood2Url,
  stepWood3: stepWood3Url,
  stepWood4: stepWood4Url
};

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
    this.buffers = new Map();
    this.samplesRequested = false;
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
      this.loadSamples();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  loadSamples() {
    if (this.samplesRequested) {
      return;
    }
    this.samplesRequested = true;
    const self = this;
    for (const name of Object.keys(SAMPLE_URLS)) {
      fetch(SAMPLE_URLS[name])
        .then(function (res) {
          return res.arrayBuffer();
        })
        .then(function (raw) {
          return self.ctx.decodeAudioData(raw);
        })
        .then(function (buffer) {
          self.buffers.set(name, buffer);
        })
        .catch(function () {});
    }
  }

  playSample(name, opts) {
    const buffer = this.buffers.get(name);
    if (buffer === undefined) {
      return false;
    }
    const o = opts || {};
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    if (o.rate) {
      src.playbackRate.value = o.rate;
    }
    const g = this.ctx.createGain();
    let gain = 1;
    if (o.gain !== undefined) {
      gain = o.gain;
    }
    g.gain.value = gain;
    g.connect(this.sfxGain);
    src.connect(g);
    src.start(this.now(), o.offset || 0);
    return true;
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
    this.playSample("bellSmall", { gain: 0.7, rate: 1.1 });
    const freqs = [880, 1244, 1760];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freqs[i];
      const g = this.envGain(t, 0.22 / (i + 1), 1.2);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 1.3);
    }
  }

  gunshot() {
    this.ensure();
    if (this.playSample("gunshot", { gain: 0.8, rate: 0.96 + Math.random() * 0.08, offset: 0.1 })) {
      return;
    }
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
    if (this.playSample("shotFar", { gain: 0.55, rate: 0.92 + Math.random() * 0.1 })) {
      return;
    }
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
    if (this.playSample("clickDry", { gain: 0.8, rate: 1.2 })) {
      return;
    }
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
    if (this.playSample("gunCock", { gain: 0.7, rate: 1 + step * 0.08 })) {
      return;
    }
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
    this.playSample("ricochetPing", { gain: 0.7, rate: 0.9 + Math.random() * 0.25 });
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.28);
    const g = this.envGain(t, 0.1, 0.3);
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
    if (this.playSample("doorSlam", { gain: 0.7, rate: 0.9 + Math.random() * 0.15 })) {
      return;
    }
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

  woodHit() {
    this.ensure();
    this.playSample("impactWood", { gain: 0.6, rate: 0.9 + Math.random() * 0.2 });
  }

  glassHit() {
    this.ensure();
    this.playSample("impactGlass", { gain: 0.6, rate: 0.95 + Math.random() * 0.1 });
  }

  horse() {
    this.ensure();
    this.playSample("horseWhinny", { gain: 3, rate: 0.95 + Math.random() * 0.1 });
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
    if (this.playSample("bellChurch", { gain: 0.9, rate: 0.62 })) {
      return;
    }
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
    const idx = Math.floor(Math.random() * 5);
    if (this.playSample("stepDirt" + idx, { gain: 1.4, rate: 0.95 + Math.random() * 0.1 })) {
      return;
    }
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

  stepWood() {
    this.ensure();
    const idx = Math.floor(Math.random() * 5);
    this.playSample("stepWood" + idx, { gain: 1.2, rate: 0.95 + Math.random() * 0.1 });
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
    this.playSample("bodyFall", { gain: 1, rate: 0.85 + Math.random() * 0.1 });
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    const g = this.envGain(t, 0.35, 0.25);
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
