import menuUrl from "./assets/audio/music_menu.mp3";
import combatUrl from "./assets/audio/music_combat.mp3";
import desertUrl from "./assets/audio/music_desert.mp3";
import saloonUrl from "./assets/audio/piano_saloon.ogg";

const TRACKS = {
  menu: { url: menuUrl, gain: 0.85 },
  combat: { url: combatUrl, gain: 0.8 },
  desert: { url: desertUrl, gain: 0.8 },
  saloon: { url: saloonUrl, gain: 0.7 }
};

export function createMusic(audio) {
  let started = false;
  let mode = "menu";
  let playing = null;
  const buffers = new Map();
  let loadRequested = false;

  function loadAll() {
    if (loadRequested) {
      return;
    }
    loadRequested = true;
    for (const name of Object.keys(TRACKS)) {
      fetch(TRACKS[name].url)
        .then(function (res) {
          return res.arrayBuffer();
        })
        .then(function (raw) {
          return audio.ctx.decodeAudioData(raw);
        })
        .then(function (buffer) {
          buffers.set(name, buffer);
          if (started && playing === null && name === mode) {
            play(mode);
          }
        })
        .catch(function () {});
    }
  }

  function play(name) {
    const buffer = buffers.get(name);
    if (buffer === undefined) {
      return;
    }
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const g = audio.ctx.createGain();
    const now = audio.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(TRACKS[name].gain, now + 0.9);
    g.connect(audio.musicGain);
    src.connect(g);
    src.start(now);
    playing = { name: name, src: src, gain: g };
  }

  function fadeOut(entry) {
    const now = audio.ctx.currentTime;
    entry.gain.gain.setValueAtTime(entry.gain.gain.value, now);
    entry.gain.gain.linearRampToValueAtTime(0.0001, now + 0.7);
    const src = entry.src;
    const g = entry.gain;
    setTimeout(function () {
      try {
        src.stop();
      } catch (err) {}
      g.disconnect();
    }, 900);
  }

  function start() {
    if (started) {
      return;
    }
    audio.ensure();
    started = true;
    loadAll();
    if (playing === null) {
      play(mode);
    }
  }

  function stop() {
    started = false;
    if (playing !== null) {
      fadeOut(playing);
      playing = null;
    }
  }

  function setMode(next) {
    if (TRACKS[next] === undefined || next === mode) {
      return;
    }
    mode = next;
    if (!started) {
      return;
    }
    if (playing !== null) {
      fadeOut(playing);
      playing = null;
    }
    play(mode);
  }

  return {
    start: start,
    stop: stop,
    setMode: setMode
  };
}
