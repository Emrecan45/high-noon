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
import { initSdk, isCrazyGames, loadingStart, loadingStop, requestMidgameAd, requestRewardedAd, getCgUser } from "./sdk.js";
import { initAccount, getProfile, ownedSkins, createProfile, buySkin, equipSkin, reportResult, claimAdReward, fetchLeaderboard } from "./account.js";
import { SKINS, skinById, portraitDataUrl } from "./skins.js";
import pkg from "../package.json";

const FLAG_FR =
  '<svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#ffffff"/><rect x="20" width="10" height="20" fill="#ef4135"/></svg>';
const FLAG_EN =
  '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#012169"/><path d="M0 0 L30 20 M30 0 L0 20" stroke="#ffffff" stroke-width="4"/><path d="M0 0 L30 20 M30 0 L0 20" stroke="#c8102e" stroke-width="2"/><path d="M15 0 V20 M0 10 H30" stroke="#ffffff" stroke-width="7"/><path d="M15 0 V20 M0 10 H30" stroke="#c8102e" stroke-width="4"/></svg>';

const PSEUDO_RE = /^[A-Za-z0-9_ .-]{3,16}$/;

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
let pendingAccountAction = null;
let shopMsgTimer = null;

function el(id) {
  return document.getElementById(id);
}

applyStatic();
el("version-tag").textContent = "v" + pkg.version.split(".").slice(0, 2).join(".");

function renderFlag() {
  if (getLang() === "fr") {
    el("btn-lang").innerHTML = FLAG_EN;
  } else {
    el("btn-lang").innerHTML = FLAG_FR;
  }
}
renderFlag();

function buildOpponentCards() {
  ui.opponentCards(PERSONAS, function (persona) {
    bootAudio();
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
  renderProfileChip();
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

let audioBooted = false;
function bootAudio() {
  if (audioBooted) {
    return;
  }
  audioBooted = true;
  audio.ensure();
  music.start();
}
document.addEventListener("pointerdown", bootAudio, { once: true, capture: true });
document.addEventListener("touchstart", bootAudio, { once: true, capture: true, passive: true });
document.addEventListener("mousedown", bootAudio, { once: true, capture: true });
document.addEventListener("click", bootAudio, { once: true, capture: true });
document.addEventListener("keydown", bootAudio, { once: true, capture: true });

function attemptAutoAudio() {
  if (audioBooted) {
    return;
  }
  audio.ensure();
  const ctx = audio.ctx;
  if (ctx.state === "running") {
    bootAudio();
    return;
  }
  ctx.resume().then(function () {
    if (ctx.state === "running") {
      bootAudio();
    }
  }).catch(function () {});
}
attemptAutoAudio();
window.addEventListener("focus", attemptAutoAudio);
document.addEventListener("visibilitychange", attemptAutoAudio);

function adMuteOn() {
  if (audio.ctx !== null) {
    audio.ctx.suspend();
  }
}

function adMuteOff() {
  if (audio.ctx !== null) {
    audio.ctx.resume();
  }
}

function renderProfileChip() {
  const profile = getProfile();
  const chip = el("profile-chip");
  if (profile === null) {
    chip.classList.add("hidden");
    return;
  }
  el("chip-head").src = portraitDataUrl(profile.skin, 64);
  el("chip-pseudo").textContent = profile.pseudo;
  el("chip-elo").textContent = "ELO " + profile.elo;
  el("chip-coins").textContent = profile.coins + " 🪙";
  chip.classList.remove("hidden");
}

function requireProfile(next) {
  if (getProfile() !== null) {
    next();
    return;
  }
  pendingAccountAction = next;
  openAccountScreen();
}

function openAccountScreen() {
  el("pseudo-error").classList.add("hidden");
  ui.showScreen("screen-account");
  if (el("pseudo-input").value === "") {
    getCgUser().then(function (cgUser) {
      if (cgUser !== null && el("pseudo-input").value === "") {
        el("pseudo-input").value = String(cgUser.username).slice(0, 16);
      }
    });
  }
}

function showPseudoError(reason) {
  const node = el("pseudo-error");
  if (reason === "taken") {
    node.textContent = t("accountTaken");
  } else if (reason === "invalid") {
    node.textContent = t("accountInvalid");
  } else {
    node.textContent = t("accountError");
  }
  node.classList.remove("hidden");
}

el("btn-pseudo-ok").addEventListener("click", async function () {
  const pseudo = el("pseudo-input").value.trim();
  if (!PSEUDO_RE.test(pseudo)) {
    showPseudoError("invalid");
    return;
  }
  el("btn-pseudo-ok").disabled = true;
  const result = await createProfile(pseudo);
  el("btn-pseudo-ok").disabled = false;
  if (!result.ok) {
    showPseudoError(result.reason);
    return;
  }
  renderProfileChip();
  const next = pendingAccountAction;
  pendingAccountAction = null;
  if (next !== null) {
    next();
  } else {
    ui.showScreen("screen-title");
  }
});

el("btn-pseudo-cancel").addEventListener("click", function () {
  pendingAccountAction = null;
  ui.showScreen("screen-title");
});

function setShopMsg(text) {
  const node = el("shop-coins");
  if (shopMsgTimer !== null) {
    clearTimeout(shopMsgTimer);
  }
  node.textContent = text;
  shopMsgTimer = setTimeout(function () {
    shopMsgTimer = null;
    renderShopCoins();
  }, 2200);
}

function renderShopCoins() {
  const profile = getProfile();
  el("shop-coins").textContent = t("shopCoins", { n: profile.coins });
}

function renderShop() {
  const profile = getProfile();
  const owned = ownedSkins();
  renderShopCoins();
  const container = el("shop-cards");
  container.innerHTML = "";
  for (const skin of SKINS) {
    const card = document.createElement("div");
    card.className = "card";
    const isOwned = owned.has(skin.id);
    const isEquipped = profile.skin === skin.id;
    if (isEquipped) {
      card.classList.add("equipped");
    } else if (!isOwned) {
      card.classList.add("locked");
    }
    let status = skin.price + " 🪙";
    if (isEquipped) {
      status = t("skinEquipped");
    } else if (isOwned) {
      status = t("skinOwned");
    }
    const img = document.createElement("img");
    img.className = "skin-portrait";
    img.src = portraitDataUrl(skin.id, 144);
    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = t(skin.nameKey);
    const price = document.createElement("div");
    price.className = "skin-price";
    price.textContent = status;
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(price);
    card.onclick = async function () {
      if (isEquipped) {
        return;
      }
      if (isOwned) {
        await equipSkin(skin.id);
      } else {
        if (profile.coins < skin.price) {
          return;
        }
        const bought = await buySkin(skin.id);
        if (bought) {
          await equipSkin(skin.id);
        }
      }
      renderProfileChip();
      renderShop();
    };
    container.appendChild(card);
  }
}

el("btn-shop").addEventListener("click", function () {
  bootAudio();
  if (!netAvailable()) {
    alert(t("connectError"));
    return;
  }
  requireProfile(function () {
    renderShop();
    if (isCrazyGames()) {
      el("btn-shop-ad").classList.remove("hidden");
    }
    ui.showScreen("screen-shop");
  });
});

el("btn-shop-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

el("btn-shop-ad").addEventListener("click", function () {
  el("btn-shop-ad").disabled = true;
  requestRewardedAd({
    onStart: adMuteOn,
    onFinish: function () {
      adMuteOff();
      el("btn-shop-ad").disabled = false;
      claimAdReward().then(function () {
        renderProfileChip();
        renderShop();
      });
    },
    onError: function () {
      adMuteOff();
      el("btn-shop-ad").disabled = false;
      setShopMsg(t("shopAdFail"));
    }
  });
});

function renderBoard(rows) {
  const list = el("board-list");
  const status = el("board-status");
  list.innerHTML = "";
  if (rows === null) {
    status.textContent = t("boardError");
    status.classList.remove("hidden");
    return;
  }
  if (rows.length === 0) {
    status.textContent = t("boardEmpty");
    status.classList.remove("hidden");
    return;
  }
  status.classList.add("hidden");
  const profile = getProfile();
  for (let i = 0; i < rows.length; i++) {
    const entry = rows[i];
    const row = document.createElement("div");
    row.className = "board-row";
    if (profile !== null && entry.pseudo === profile.pseudo) {
      row.classList.add("me");
    }
    const rank = document.createElement("span");
    rank.className = "board-rank";
    rank.textContent = "#" + (i + 1);
    const img = document.createElement("img");
    img.src = portraitDataUrl(entry.skin, 72);
    const pseudo = document.createElement("span");
    pseudo.className = "board-pseudo";
    pseudo.textContent = entry.pseudo;
    const elo = document.createElement("span");
    elo.className = "board-elo";
    elo.textContent = entry.elo;
    row.appendChild(rank);
    row.appendChild(img);
    row.appendChild(pseudo);
    row.appendChild(elo);
    list.appendChild(row);
  }
}

el("btn-board").addEventListener("click", function () {
  bootAudio();
  if (!netAvailable()) {
    alert(t("connectError"));
    return;
  }
  el("board-list").innerHTML = "";
  el("board-status").textContent = "…";
  el("board-status").classList.remove("hidden");
  ui.showScreen("screen-board");
  fetchLeaderboard().then(renderBoard);
});

el("btn-board-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

function backToMenu() {
  activeDuel = null;
  cowboy.reset();
  cowboy.setSkin(skinById("drifter").colors);
  viewmodel.holster();
  arena.applyModifier({ id: "noon", sway: 0 }, 19);
  ui.hudVisible(false);
  ui.showScreen("screen-title");
  renderProfileChip();
  requestMidgameAd({ onStart: adMuteOn, onDone: adMuteOff });
}

function duelProfile() {
  const profile = getProfile();
  if (profile === null) {
    return null;
  }
  return { pseudo: profile.pseudo, skin: profile.skin, elo: profile.elo };
}

function handleResult(ranked) {
  return function (won, oppElo) {
    if (getProfile() === null || !netAvailable()) {
      return;
    }
    reportResult(won, ranked, oppElo).then(function (result) {
      if (result === null) {
        return;
      }
      renderProfileChip();
      if (el("screen-matchend").classList.contains("hidden")) {
        return;
      }
      const detail = el("matchend-detail");
      if (ranked) {
        let deltaStr = String(result.elo_delta);
        if (result.elo_delta >= 0) {
          deltaStr = "+" + result.elo_delta;
        }
        detail.textContent += t("resultRanked", { elo: result.elo, delta: deltaStr, coins: result.coins_delta });
      } else {
        detail.textContent += t("resultCoins", { coins: result.coins_delta });
      }
    });
  };
}

function startAiDuel(persona) {
  cowboy.setSkin(skinById("drifter").colors);
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
    ranked: false,
    profile: duelProfile(),
    onResult: handleResult(false),
    onExit: backToMenu
  });
  activeDuel.start();
}

function startNetDuel(room, ranked) {
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
    ranked: ranked,
    profile: duelProfile(),
    onResult: handleResult(ranked),
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

function startSearch(ranked) {
  if (ranked) {
    el("search-title").textContent = t("searchRankedTitle");
  } else {
    el("search-title").textContent = t("searchTitle");
  }
  ui.showScreen("screen-search");
  ui.searchTick(0, false);
  let seconds = 0;
  let options = null;
  if (ranked) {
    options = { ranked: true, elo: getProfile().elo };
  }
  matchmaker = createMatchmaker(options);
  searchInterval = setInterval(function () {
    seconds += 1;
    ui.searchTick(seconds, !ranked && seconds >= 8);
  }, 1000);
  matchmaker.search({
    onMatched: function (room) {
      stopSearch();
      startNetDuel(room, ranked);
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
  bootAudio();
  ui.showScreen("screen-opponents");
});

buildOpponentCards();
if (isTouch) {
  document.body.classList.add("touch");
}

el("btn-online").addEventListener("click", function () {
  bootAudio();
  if (!netAvailable()) {
    ui.showScreen("screen-search");
    ui.searchTick(0, true);
    return;
  }
  startSearch(false);
});

el("btn-ranked").addEventListener("click", function () {
  bootAudio();
  if (!netAvailable()) {
    alert(t("connectError"));
    return;
  }
  requireProfile(function () {
    startSearch(true);
  });
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
  bootAudio();
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

async function boot() {
  await initSdk();
  loadingStart();
  if (isCrazyGames()) {
    const footer = document.querySelector(".footer-note");
    footer.classList.add("hidden");
  }
  try {
    await initAccount();
  } catch (err) {}
  renderProfileChip();
  loadingStop();
}

ui.showScreen("screen-title");
loop();
boot();
