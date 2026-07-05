const BEAT = 0.78;
const LOOP_BEATS = 16;

const BASS = [
  { beat: 0, freq: 110 },
  { beat: 4, freq: 87.31 },
  { beat: 8, freq: 98 },
  { beat: 12, freq: 82.41 }
];

const WHISTLE = [
  { beat: 0.5, freq: 329.63, dur: 1 },
  { beat: 2, freq: 392, dur: 0.5 },
  { beat: 2.5, freq: 440, dur: 1.5 },
  { beat: 6, freq: 523.25, dur: 1 },
  { beat: 7.5, freq: 440, dur: 0.5 },
  { beat: 8.5, freq: 392, dur: 1 },
  { beat: 10, freq: 329.63, dur: 2 },
  { beat: 14, freq: 293.66, dur: 1.5 }
];

export function createMusic(audio) {
  let started = false;
  let timer = null;
  let loopStart = 0;

  function pluck(start, freq) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + BEAT * 3.2);
    g.connect(audio.musicGain);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + BEAT * 3.4);
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
    g.gain.setValueAtTime(0.12, start + dur * BEAT - 0.12);
    g.gain.linearRampToValueAtTime(0.0001, start + dur * BEAT);
    g.connect(audio.musicGain);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + dur * BEAT + 0.05);
    vibrato.start(start);
    vibrato.stop(start + dur * BEAT + 0.05);
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

  function scheduleLoop(start) {
    for (const note of BASS) {
      pluck(start + note.beat * BEAT, note.freq);
    }
    for (const note of WHISTLE) {
      whistle(start + note.beat * BEAT, note.freq, note.dur);
    }
    for (let b = 0; b < LOOP_BEATS; b++) {
      shaker(start + (b + 0.5) * BEAT);
    }
  }

  function tick() {
    const loopDur = LOOP_BEATS * BEAT;
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

  return {
    start: start,
    stop: stop
  };
}
