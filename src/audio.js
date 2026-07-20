import gunshotUrl from "./assets/audio/gunshot_45.wav";
import shotFarUrl from "./assets/audio/shot_far.ogg";
import bellSmallUrl from "./assets/audio/bell_small.ogg";
import bellChurchUrl from "./assets/audio/bell_church.ogg";
import bodyFallUrl from "./assets/audio/body_fall.ogg";
import ricochetPingUrl from "./assets/audio/ricochet_ping.ogg";
import clickDryUrl from "./assets/audio/click_dry.ogg";
import gunCockUrl from "./assets/audio/gun_cock.ogg";
import doorSlamUrl from "./assets/audio/door_slam.ogg";
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
import uiClick0Url from "./assets/audio/ui_click_0.ogg";
import uiClick1Url from "./assets/audio/ui_click_1.ogg";
import coins0Url from "./assets/audio/coins_0.ogg";
import coins1Url from "./assets/audio/coins_1.ogg";
import cloth0Url from "./assets/audio/cloth_0.ogg";
import cloth1Url from "./assets/audio/cloth_1.ogg";
import creakUrl from "./assets/audio/creak.ogg";

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
  stepWood4: stepWood4Url,
  uiClick0: uiClick0Url,
  uiClick1: uiClick1Url,
  coins0: coins0Url,
  coins1: coins1Url,
  cloth0: cloth0Url,
  cloth1: cloth1Url,
  creak: creakUrl
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
    this.musicVolume = storedVolume("hn-music-vol", 0.6);
    this.muted = false;
    this.buffers = new Map();
    this.samplesRequested = false;
    this.shotSrc = null;
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
      this.musicGain.gain.value = this.musicVolume * 0.5;
      this.musicGain.connect(this.master);
      this.applyGains();
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
      return null;
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
    return src;
  }

  muffle(active) {
    this.ensure();
    let target = 20000;
    if (active) {
      target = 620;
    }
    this.master.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.07);
  }

  applyGains() {
    if (this.sfxGain !== null) {
      this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume;
    }
    if (this.musicGain !== null) {
      this.musicGain.gain.value = this.muted ? 0 : this.musicVolume * 0.5;
    }
  }

  setMuted(value) {
    this.muted = value === true;
    this.applyGains();
  }

  setSfxVolume(value) {
    this.sfxVolume = value;
    localStorage.setItem("hn-sfx-vol", String(value));
    this.applyGains();
  }

  setMusicVolume(value) {
    this.musicVolume = value;
    localStorage.setItem("hn-music-vol", String(value));
    this.applyGains();
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
    this.playSample("bellSmall", { gain: 0.8, rate: 1.1 });
  }

  gunshot() {
    this.ensure();
    if (this.shotSrc) {
      try {
        this.shotSrc.stop();
      } catch (err) {}
      this.shotSrc = null;
    }
    this.shotSrc = this.playSample("gunshot", { gain: 1, rate: 0.97 + Math.random() * 0.06 });
  }

  distantShot() {
    this.ensure();
    const buffer = this.buffers.get("gunshot");
    if (buffer === undefined) {
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 0.92 + Math.random() * 0.08;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    const g = this.ctx.createGain();
    g.gain.value = 0.8;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(this.now());
  }

  metalClick(when, gain, freq) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.06);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 7;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(when);
    src.stop(when + 0.07);
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq * 1.6, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + 0.03);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.0001, when);
    og.gain.exponentialRampToValueAtTime(gain * 0.3, when + 0.0015);
    og.gain.exponentialRampToValueAtTime(0.0001, when + 0.028);
    osc.connect(og);
    og.connect(this.sfxGain);
    osc.start(when);
    osc.stop(when + 0.05);
  }

  reloadClick(step) {
  }

  friendPing() {
    this.ensure();
    const self = this;
    this.playSample("bellSmall", { gain: 0.5, rate: 1.5 });
    setTimeout(function () {
      self.playSample("bellSmall", { gain: 0.42, rate: 2.02 });
    }, 110);
  }

  ricochet() {
    this.ensure();
    this.playSample("ricochetPing", { gain: 0.7, rate: 0.9 + Math.random() * 0.25 });
  }

  levelShot() {
    this.ensure();
    const self = this;
    this.playSample("gunshot", { gain: 1, rate: 0.68 });
    setTimeout(function () {
      self.playSample("impactWood", { gain: 0.7, rate: 0.66 });
    }, 45);
    setTimeout(function () {
      self.playSample("ricochetPing", { gain: 0.5, rate: 1.35 });
    }, 110);
  }

  levelLand() {
    this.ensure();
    const self = this;
    this.playSample("doorSlam", { gain: 0.4, rate: 0.6 });
    setTimeout(function () {
      self.playSample("bellSmall", { gain: 0.35, rate: 1.22 });
    }, 140);
    setTimeout(function () {
      self.playSample("bellSmall", { gain: 0.3, rate: 1.63 });
    }, 320);
  }

  whoosh() {
    this.ensure();
    this.playSample("cloth1", { gain: 1.2, rate: 0.85 + Math.random() * 0.15 });
  }

  crow() {
    this.ensure();
    this.playSample("creak", { gain: 0.6, rate: 0.9 + Math.random() * 0.2 });
  }

  doorCreak() {
    this.ensure();
    this.playSample("creak", { gain: 0.9, rate: 0.68 });
  }

  bang() {
    this.ensure();
    this.playSample("doorSlam", { gain: 0.7, rate: 0.9 + Math.random() * 0.15 });
  }

  woodHit() {
    this.ensure();
    this.playSample("impactWood", { gain: 0.6, rate: 0.9 + Math.random() * 0.2 });
  }

  glassHit() {
    this.ensure();
    this.playSample("impactGlass", { gain: 0.6, rate: 0.95 + Math.random() * 0.1 });
  }

  sandHit() {
    this.ensure();
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.2);
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.14);
    filter.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + 0.22);
    const thud = this.ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(170, t);
    thud.frequency.exponentialRampToValueAtTime(55, t + 0.13);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.55, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    thud.connect(tg);
    tg.connect(this.sfxGain);
    thud.start(t);
    thud.stop(t + 0.17);
  }

  poof() {
    this.ensure();
    this.playSample("cloth1", { gain: 1.1, rate: 1.3 + Math.random() * 0.2 });
  }

  reveal() {
    this.ensure();
    const t = this.now();
    this.metalClick(t, 0.5, 2200);
    this.metalClick(t + 0.06, 0.4, 2900);
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
    this.playSample("bellChurch", { gain: 0.9, rate: 0.62 });
  }

  step() {
    this.ensure();
    const idx = Math.floor(Math.random() * 5);
    this.playSample("stepDirt" + idx, { gain: 0.5, rate: 0.95 + Math.random() * 0.1 });
  }

  stepSoft() {
    this.ensure();
    const idx = Math.floor(Math.random() * 5);
    this.playSample("stepDirt" + idx, { gain: 0.25, rate: 0.82 + Math.random() * 0.08 });
  }

  stepWood() {
    this.ensure();
    const idx = Math.floor(Math.random() * 5);
    this.playSample("stepWood" + idx, { gain: 0.4, rate: 0.95 + Math.random() * 0.1 });
  }

  footsteps() {
    this.step();
    const self = this;
    setTimeout(function () {
      self.step();
    }, 260);
  }

  duelSting() {
    this.ensure();
    this.playSample("bellChurch", { gain: 0.55, rate: 0.5 });
  }

  uiClick() {
    this.ensure();
    const idx = Math.floor(Math.random() * 2);
    this.playSample("uiClick" + idx, { gain: 0.7, rate: 0.98 + Math.random() * 0.06 });
  }

  coin() {
    this.ensure();
    this.playSample("coins0", { gain: 0.9, rate: 1 + Math.random() * 0.08 });
  }

  equip() {
    this.ensure();
    const idx = Math.floor(Math.random() * 2);
    this.playSample("cloth" + idx, { gain: 1, rate: 0.95 + Math.random() * 0.1 });
  }

  wheelWin() {
    this.ensure();
    this.playSample("coins1", { gain: 1, rate: 1 });
    this.playSample("bellSmall", { gain: 0.4, rate: 1.3 });
  }

  thud() {
    this.ensure();
    this.playSample("bodyFall", { gain: 1, rate: 0.85 + Math.random() * 0.1 });
  }

  victory() {
    this.ensure();
    this.playSample("coins1", { gain: 0.9, rate: 1.05 });
    this.playSample("bellSmall", { gain: 0.8, rate: 1 });
  }

  defeat() {
    this.ensure();
    this.playSample("bellChurch", { gain: 0.7, rate: 0.45 });
  }

  textBlip() {
    this.ensure();
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(360 + Math.random() * 60, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.06);
  }
}
