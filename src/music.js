const MENU = {
  beat: 0.78,
  loopBeats: 16,
  bass: [
    { beat: 0, freq: 110 },
    { beat: 4, freq: 87.31 },
    { beat: 8, freq: 98 },
    { beat: 12, freq: 82.41 }
  ],
  whistle: [
    { beat: 0.5, freq: 329.63, dur: 1 },
    { beat: 2, freq: 392, dur: 0.5 },
    { beat: 2.5, freq: 440, dur: 1.5 },
    { beat: 6, freq: 523.25, dur: 1 },
    { beat: 7.5, freq: 440, dur: 0.5 },
    { beat: 8.5, freq: 392, dur: 1 },
    { beat: 10, freq: 329.63, dur: 2 },
    { beat: 14, freq: 293.66, dur: 1.5 }
  ]
};

const COMBAT = {
  beat: 0.5,
  loopBeats: 8,
  pulse: [
    { beat: 0, freq: 73.42 },
    { beat: 1, freq: 73.42 },
    { beat: 2, freq: 73.42 },
    { beat: 3, freq: 87.31 },
    { beat: 4, freq: 65.41 },
    { beat: 5, freq: 65.41 },
    { beat: 6, freq: 73.42 },
    { beat: 7, freq: 69.3 }
  ],
  heart: [0, 0.55, 4, 4.55],
  lead: [
    { beat: 2, freq: 293.66, dur: 1 },
    { beat: 5, freq: 311.13, dur: 0.5 },
    { beat: 6.5, freq: 277.18, dur: 1.5 }
  ]
};

export function createMusic(audio) {
  let started = false;
  let timer = null;
  let loopStart = 0;
  let cfg = MENU;

  function pluck(start, freq) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + cfg.beat * 3.2);
    g.connect(audio.musicGain);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + cfg.beat * 3.4);
  }

  function whistle(start, freq, dur) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 5;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.12, start + 0.09);
    g.gain.setValueAtTime(0.12, start + dur * cfg.beat - 0.12);
    g.gain.linearRampToValueAtTime(0.0001, start + dur * cfg.beat);
    g.connect(audio.musicGain);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + dur * cfg.beat + 0.05);
    vibrato.start(start);
    vibrato.stop(start + dur * cfg.beat + 0.05);
  }

  function shaker(start) {
    const ctx = audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = audio.noiseBuffer(0.06);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);
    g.connect(audio.musicGain);
    src.connect(filter);
    filter.connect(g);
    src.start(start);
  }

  function stab(start, freq) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.26, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + cfg.beat * 0.9);
    g.connect(audio.musicGain);
    osc.connect(filter);
    filter.connect(g);
    osc.start(start);
    osc.stop(start + cfg.beat);
  }

  function heartbeat(start) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, start);
    osc.frequency.exponentialRampToValueAtTime(42, start + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    g.connect(audio.musicGain);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + 0.24);
  }

  function reed(start, freq, dur) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.09, start + 0.12);
    g.gain.setValueAtTime(0.09, start + dur * cfg.beat - 0.12);
    g.gain.linearRampToValueAtTime(0.0001, start + dur * cfg.beat);
    g.connect(audio.musicGain);
    osc.connect(filter);
    filter.connect(g);
    osc.start(start);
    osc.stop(start + dur * cfg.beat + 0.05);
  }

  function scheduleLoop(start) {
    if (cfg === MENU) {
      for (const note of cfg.bass) {
        pluck(start + note.beat * cfg.beat, note.freq);
      }
      for (const note of cfg.whistle) {
        whistle(start + note.beat * cfg.beat, note.freq, note.dur);
      }
      for (let b = 0; b < cfg.loopBeats; b++) {
        shaker(start + (b + 0.5) * cfg.beat);
      }
      return;
    }
    for (const note of cfg.pulse) {
      stab(start + note.beat * cfg.beat, note.freq);
    }
    for (const beat of cfg.heart) {
      heartbeat(start + beat * cfg.beat);
    }
    for (const note of cfg.lead) {
      reed(start + note.beat * cfg.beat, note.freq, note.dur);
    }
  }

  function tick() {
    const loopDur = cfg.loopBeats * cfg.beat;
    while (loopStart < audio.ctx.currentTime + 0.5) {
      scheduleLoop(loopStart);
      loopStart += loopDur;
    }
  }

  function start() {
    if (started) {
      return;
    }
    audio.ensure();
    started = true;
    loopStart = audio.ctx.currentTime + 0.1;
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
