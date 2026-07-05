import { createArena } from "./scene.js";
import { createCowboy } from "./cowboy.js";
import { createViewmodel } from "./viewmodel.js";
import { createUi } from "./ui.js";
import { AudioEngine } from "./audio.js";
import { createMusic } from "./music.js";
import { AiOpponent, PERSONAS } from "./ai.js";
import { Duel } from "./duel.js";
import { createRng, randomSeed } from "./rng.js";
import { netAvailable, createMatchmaker } from "./net.js";
import { getLang, setLang, t, applyStatic } from "./i18n.js";
import pkg from "../package.json";

const FLAG_FR =
  '<svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#ffffff"/><rect x="20" width="10" height="20" fill="#ef4135"/></svg>';
const FLAG_EN =
  '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#012169"/><path d="M0 0 L30 20 M30 0 L0 20" stroke="#ffffff" stroke-width="4"/><path d="M0 0 L30 20 M30 0 L0 20" stroke="#c8102e" stroke-width="2"/><path d="M15 0 V20 M0 10 H30" stroke="#ffffff" stroke-width="7"/><path d="M15 0 V20 M0 10 H30" stroke="#c8102e" stroke-width="4"/></svg>';

const arena = createArena(document.getElementById("game"));
const cowboy = createCowboy();
arena.opponentAnchor.add(cowboy.group);
const viewmodel = createViewmodel(arena.camera);
const ui = createUi();
const audio = new AudioEngine();
const music = createMusic(audio);
const isTouch = window.matchMedia("(pointer: coarse)").matches;

let activeDuel = null;
let matchmaker = null;
let searchInterval = null;

function el(id) {
  return document.getElementById(id);
}

applyStatic();
el("version-tag").textContent = "v" + pkg.version.split(".").slice(0, 2).join(".");

function renderFlag() {
  if (getLang() === "fr") {
    el("btn-lang").innerHTML = FLAG_FR;
  } else {
    el("btn-lang").innerHTML = FLAG_EN;
  }
}
renderFlag();

function buildOpponentCards() {
  ui.opponentCards(PERSONAS, function (persona) {
    startAiDuel(persona);
  });
}

el("btn-lang").addEventListener("click", function () {
  if (getLang() === "fr") {
    setLang("en");
  } else {
    setLang("fr");
  }
  applyStatic();
  renderFlag();
  buildOpponentCards();
});

const musicSlider = el("vol-music");
const sfxSlider = el("vol-sfx");
musicSlider.value = String(Math.round(audio.musicVolume * 100));
sfxSlider.value = String(Math.round(audio.sfxVolume * 100));
musicSlider.addEventListener("input", function () {
  audio.setMusicVolume(Number(musicSlider.value) / 100);
});
sfxSlider.addEventListener("input", function () {
  audio.setSfxVolume(Number(sfxSlider.value) / 100);
});

function bootAudio() {
  audio.ensure();
  music.start();
}
document.addEventListener("pointerdown", bootAudio, { once: true });
document.addEventListener("keydown", bootAudio, { once: true });

function backToMenu() {
  activeDuel = null;
  cowboy.reset();
  viewmodel.holster();
  arena.applyModifier({ id: "noon", distance: 14, sway: 0 });
  ui.hudVisible(false);
  ui.showScreen("screen-title");
}

function startAiDuel(persona) {
  const ai = new AiOpponent(persona, createRng(randomSeed()));
  activeDuel = new Duel({
    arena: arena,
    ui: ui,
    audio: audio,
    cowboy: cowboy,
    viewmodel: viewmodel,
    mode: "ai",
    ai: ai,
    net: null,
    matchSeed: randomSeed(),
    isTouch: isTouch,
    onExit: backToMenu
  });
  activeDuel.start();
}

function startNetDuel(room) {
  activeDuel = new Duel({
    arena: arena,
    ui: ui,
    audio: audio,
    cowboy: cowboy,
    viewmodel: viewmodel,
    mode: "net",
    ai: null,
    net: room,
    matchSeed: room.seed,
    isTouch: isTouch,
    onExit: backToMenu
  });
  activeDuel.start();
}

function randomPersona() {
  const idx = Math.floor(Math.random() * PERSONAS.length);
  return PERSONAS[idx];
}

function stopSearch() {
  if (searchInterval !== null) {
    clearInterval(searchInterval);
    searchInterval = null;
  }
  if (matchmaker !== null) {
    matchmaker.cancel();
    matchmaker = null;
  }
}

function startSearch() {
  ui.showScreen("screen-search");
  ui.searchTick(0, false);
  let seconds = 0;
  matchmaker = createMatchmaker();
  searchInterval = setInterval(function () {
    seconds += 1;
    ui.searchTick(seconds, seconds >= 8);
  }, 1000);
  matchmaker.search({
    onMatched: function (room) {
      stopSearch();
      startNetDuel(room);
    },
    onPairFailed: function () {},
    onError: function () {
      stopSearch();
      ui.showScreen("screen-title");
      alert(t("connectError"));
    }
  });
}

el("btn-ai").addEventListener("click", function () {
  ui.showScreen("screen-opponents");
});

buildOpponentCards();
if (isTouch) {
  document.body.classList.add("touch");
}

el("btn-online").addEventListener("click", function () {
  if (!netAvailable()) {
    ui.showScreen("screen-search");
    ui.searchTick(0, true);
    return;
  }
  startSearch();
});

el("btn-search-ai").addEventListener("click", function () {
  stopSearch();
  startAiDuel(randomPersona());
});

el("btn-search-cancel").addEventListener("click", function () {
  stopSearch();
  ui.showScreen("screen-title");
});

el("btn-help").addEventListener("click", function () {
  ui.showScreen("screen-help");
});

el("btn-help-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

el("btn-opp-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

let lastTime = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  arena.update(dt);
  cowboy.update(dt);
  viewmodel.update(dt);
  if (activeDuel !== null) {
    activeDuel.update(now, dt);
  }
  arena.renderer.render(arena.scene, arena.camera);
}

ui.showScreen("screen-title");
loop();
