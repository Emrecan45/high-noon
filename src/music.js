const MENU = {
  beat: 0.72,
  loopBeats: 16,
  bass: [
    { beat: 0, freq: 110 },
    { beat: 3, freq: 110 },
    { beat: 4, freq: 146.83 },
    { beat: 7, freq: 130.81 },
    { beat: 8, freq: 98 },
    { beat: 11, freq: 98 },
    { beat: 12, freq: 82.41 },
    { beat: 14, freq: 110 }
  ],
  leadA: [
    { beat: 0.5, freq: 659.25, dur: 1 },
    { beat: 2, freq: 587.33, dur: 0.5 },
    { beat: 2.5, freq: 659.25, dur: 1.5 },
    { beat: 5, freq: 783.99, dur: 1 },
    { beat: 7, freq: 659.25, dur: 1 },
    { beat: 9, freq: 587.33, dur: 2 },
    { beat: 12.5, freq: 523.25, dur: 1.5 },
    { beat: 14.5, freq: 440, dur: 1.2 }
  ],
  leadB: [
    { beat: 0.5, freq: 523.25, dur: 1.5 },
    { beat: 3, freq: 659.25, dur: 1 },
    { beat: 5, freq: 587.33, dur: 0.5 },
    { beat: 5.5, freq: 523.25, dur: 1.5 },
    { beat: 8, freq: 493.88, dur: 1 },
    { beat: 10, freq: 440, dur: 2 },
    { beat: 13, freq: 587.33, dur: 1.2 },
    { beat: 15, freq: 659.25, dur: 1 }
  ]
};

const COMBAT = {
  beat: 0.46,
  loopBeats: 16,
  drone: [
    { beat: 0, freq: 73.42, dur: 8 },
    { beat: 8, freq: 65.41, dur: 8 }
  ],
  leadA: [
    { beat: 2, freq: 293.66, dur: 1 },
    { beat: 4, freq: 311.13, dur: 0.5 },
    { beat: 6, freq: 277.18, dur: 1.5 },
    { beat: 10, freq: 349.23, dur: 1 },
    { beat: 13, freq: 311.13, dur: 2 }
  ],
  leadB: [
    { beat: 1, freq: 349.23, dur: 1 },
    { beat: 4, freq: 392, dur: 1.5 },
    { beat: 8, freq: 311.13, dur: 1 },
    { beat: 11, freq: 293.66, dur: 0.5 },
    { beat: 12, freq: 277.18, dur: 2.5 }
  ]
};

export function createMusic(audio) {
  let started = false;
  let timer = null;
  let loopStart = 0;
  let loopIndex = 0;
  let cfg = MENU;

  function twang(start, freq) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq * 1.02, start);
    osc.frequency.exponentialRampToValueAtTime(freq, start + 0.06);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1900, start);
    filter.frequency.exponentialRampToValueAtTime(360, start + cfg.beat * 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.26, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + cfg.beat * 2.6);
    g.connect(audio.musicGain);
    osc.connect(filter);
    filter.connect(g);
    osc.start(start);
    osc.stop(start + cfg.beat * 2.8);
  }

  function whistle(start, freq, dur) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.5;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 6;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.12, start + 0.1);
    g.gain.setValueAtTime(0.12, start + dur * cfg.beat - 0.12);
    g.gain.linearRampToValueAtTime(0.0001, start + dur * cfg.beat);
    g.connect(audio.musicGain);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + dur * cfg.beat + 0.05);
    vibrato.start(start);
    vibrato.stop(start + dur * cfg.beat + 0.05);
  }

  function tambourine(start) {
    const ctx = audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = audio.noiseBuffer(0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.045, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
    g.connect(audio.musicGain);
    src.connect(filter);
    filter.connect(g);
    src.start(start);
  }

  function gallop(start) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, start);
    osc.frequency.exponentialRampToValueAtTime(55, start + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.24, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    g.connect(audio.musicGain);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + 0.2);
  }

  function drone(start, freq, beats) {
    const ctx = audio.ctx;
    const dur = beats * cfg.beat;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.14, start + 0.4);
    g.gain.setValueAtTime(0.14, start + dur - 0.4);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    g.connect(audio.musicGain);
    osc.connect(filter);
    filter.connect(g);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  function reed(start, freq, dur) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 6;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 4;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.1, start + 0.12);
    g.gain.setValueAtTime(0.1, start + dur * cfg.beat - 0.14);
    g.gain.linearRampToValueAtTime(0.0001, start + dur * cfg.beat);
    g.connect(audio.musicGain);
    osc.connect(filter);
    filter.connect(g);
    osc.start(start);
    osc.stop(start + dur * cfg.beat + 0.05);
    vibrato.start(start);
    vibrato.stop(start + dur * cfg.beat + 0.05);
  }

  function scheduleLoop(start, index) {
    const b = cfg.beat;
    if (cfg === MENU) {
      for (const note of cfg.bass) {
        twang(start + note.beat * b, note.freq);
      }
      let lead = cfg.leadA;
      if (index % 2 === 1) {
        lead = cfg.leadB;
      }
      for (const note of lead) {
        whistle(start + note.beat * b, note.freq, note.dur);
      }
      for (let i = 0; i < cfg.loopBeats; i++) {
        tambourine(start + (i + 0.5) * b);
      }
      return;
    }
    for (const note of cfg.drone) {
      drone(start + note.beat * b, note.freq, note.dur);
    }
    for (let i = 0; i < cfg.loopBeats; i++) {
      gallop(start + i * b);
      gallop(start + (i + 0.33) * b);
    }
    let lead = cfg.leadA;
    if (index % 2 === 1) {
      lead = cfg.leadB;
    }
    for (const note of lead) {
      reed(start + note.beat * b, note.freq, note.dur);
    }
  }

  function tick() {
    const loopDur = cfg.loopBeats * cfg.beat;
    while (loopStart < audio.ctx.currentTime + 0.5) {
      scheduleLoop(loopStart, loopIndex);
      loopStart += loopDur;
      loopIndex += 1;
    }
  }

  function start() {
    if (started) {
      return;
    }
    audio.ensure();
    started = true;
    loopStart = audio.ctx.currentTime + 0.1;
    loopIndex = 0;
    tick();
    timer = setInterval(tick, 400);
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    started = false;
  }

  function setMode(mode) {
    let next = MENU;
    if (mode === "combat") {
      next = COMBAT;
    }
    if (next === cfg) {
      return;
    }
    cfg = next;
    loopIndex = 0;
    if (started && audio.ctx !== null) {
      loopStart = audio.ctx.currentTime + 0.1;
    }
  }

  return {
    start: start,
    stop: stop,
    setMode: setMode
  };
}
