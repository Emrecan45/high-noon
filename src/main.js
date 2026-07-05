import { createArena } from "./scene.js";
import { createCowboy } from "./cowboy.js";
import { createViewmodel } from "./viewmodel.js";
import { createUi } from "./ui.js";
import { AudioEngine } from "./audio.js";
import { AiOpponent, PERSONAS } from "./ai.js";
import { Duel } from "./duel.js";
import { createRng, randomSeed } from "./rng.js";
import { netAvailable, createMatchmaker } from "./net.js";

const arena = createArena(document.getElementById("game"));
const cowboy = createCowboy();
arena.opponentAnchor.add(cowboy.group);
const viewmodel = createViewmodel(arena.camera);
const ui = createUi();
const audio = new AudioEngine();
const isTouch = window.matchMedia("(pointer: coarse)").matches;

let activeDuel = null;
let matchmaker = null;
let searchInterval = null;

function el(id) {
  return document.getElementById(id);
}

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
      alert("Connexion impossible au serveur de matchmaking.");
    }
  });
}

el("btn-ai").addEventListener("click", function () {
  audio.ensure();
  ui.showScreen("screen-opponents");
});

ui.opponentCards(PERSONAS, function (persona) {
  audio.ensure();
  startAiDuel(persona);
});

el("btn-online").addEventListener("click", function () {
  audio.ensure();
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
