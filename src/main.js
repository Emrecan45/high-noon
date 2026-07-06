import { createArena } from "./scene.js";
import { createCowboy } from "./cowboy.js";
import { createViewmodel } from "./viewmodel.js";
import { createUi } from "./ui.js";
import { AudioEngine } from "./audio.js";
import { createMusic } from "./music.js";
import { AiOpponent, PERSONAS } from "./ai.js";
import { Duel } from "./duel.js";
import { createRng, randomSeed } from "./rng.js";
import { netAvailable, createMatchmaker, createPrivateRoom } from "./net.js";
import { getLang, setLang, t, applyStatic } from "./i18n.js";
import { initSdk, isCrazyGames, loadingStart, loadingStop, requestMidgameAd, requestRewardedAd, getCgUser, getInviteParam, inviteLink, showInviteButton, hideInviteButton, isInstantMultiplayer } from "./sdk.js";
import { initAccount, getProfile, ensureAccount, localPseudo, renamePseudo, ownedSkins, buySkin, equipSkin, reportResult, recordStats, claimAdReward, fetchLeaderboard } from "./account.js";
import { SKINS, skinById, portraitDataUrl } from "./skins.js";
import { eloTitleKey } from "./titles.js";
import pkg from "../package.json";

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
let friendRoom = null;
let friendCode = null;
let shopMsgTimer = null;
let copyTimer = null;

function el(id) {
  return document.getElementById(id);
}

applyStatic();
el("version-tag").textContent = "v" + pkg.version.split(".").slice(0, 2).join(".");

function buildOpponentCards() {
  ui.opponentCards(PERSONAS, function (persona) {
    bootAudio();
    startAiDuel(persona);
  });
}

const langSelect = el("lang-select");
langSelect.value = getLang();
langSelect.addEventListener("change", function () {
  setLang(langSelect.value);
  applyStatic();
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
  if (profile !== null) {
    el("chip-head").src = portraitDataUrl(profile.skin, 64);
    el("chip-pseudo").textContent = profile.pseudo;
    el("chip-elo").textContent = "ELO " + profile.elo;
    el("chip-coins").textContent = profile.coins + " 🪙";
  } else {
    el("chip-head").src = portraitDataUrl("drifter", 64);
    el("chip-pseudo").textContent = localPseudo();
    el("chip-elo").textContent = "";
    el("chip-coins").textContent = "";
  }
  chip.classList.remove("hidden");
}

function showPseudoMsg(kind) {
  const node = el("pseudo-error");
  node.classList.remove("ok-text");
  if (kind === "saved") {
    node.textContent = t("pseudoSaved");
    node.classList.add("ok-text");
  } else if (kind === "taken") {
    node.textContent = t("accountTaken");
  } else if (kind === "invalid") {
    node.textContent = t("accountInvalid");
  } else {
    node.textContent = t("accountError");
  }
  node.classList.remove("hidden");
}

async function openProfile() {
  bootAudio();
  if (!netAvailable()) {
    alert(t("connectError"));
    return;
  }
  const profile = await ensureAccount();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  renderProfileChip();
  el("pseudo-input").value = profile.pseudo;
  el("pseudo-error").classList.add("hidden");
  renderStatsBlock();
  renderShop();
  if (isCrazyGames()) {
    el("btn-shop-ad").classList.remove("hidden");
  }
  ui.showScreen("screen-profile");
}

el("profile-chip").addEventListener("click", openProfile);

el("btn-pseudo-save").addEventListener("click", async function () {
  const pseudo = el("pseudo-input").value.trim();
  if (!PSEUDO_RE.test(pseudo)) {
    showPseudoMsg("invalid");
    return;
  }
  el("btn-pseudo-save").disabled = true;
  const result = await renamePseudo(pseudo);
  el("btn-pseudo-save").disabled = false;
  if (result.ok) {
    showPseudoMsg("saved");
    renderProfileChip();
  } else {
    showPseudoMsg(result.reason);
  }
});

el("btn-profile-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

function statRow(container, label, value) {
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("span");
  valueNode.className = "stat-value";
  valueNode.textContent = value;
  container.appendChild(labelNode);
  container.appendChild(valueNode);
}

function renderStatsBlock() {
  const profile = getProfile();
  const block = el("stats-block");
  block.innerHTML = "";
  statRow(block, t("statsTitle"), t(eloTitleKey(profile.elo)));
  statRow(block, t("statsMatches"), t("statsMatchesValue", { w: profile.wins, l: profile.losses }));
  let accuracy = "-";
  let headPct = "-";
  let streak = "-";
  if (Number.isFinite(profile.shots_fired)) {
    if (profile.shots_fired > 0) {
      accuracy = Math.round((profile.shots_hit / profile.shots_fired) * 100) + "%";
    }
    if (profile.shots_hit > 0) {
      headPct = Math.round((profile.headshots / profile.shots_hit) * 100) + "%";
    }
    streak = t("statsStreakValue", { cur: profile.win_streak, best: profile.best_streak });
  }
  statRow(block, t("statsAccuracy"), accuracy);
  statRow(block, t("statsHead"), headPct);
  statRow(block, t("statsStreak"), streak);
}

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
    const nameWrap = document.createElement("span");
    nameWrap.className = "board-name";
    const pseudo = document.createElement("span");
    pseudo.className = "board-pseudo";
    pseudo.textContent = entry.pseudo;
    const title = document.createElement("span");
    title.className = "board-title";
    title.textContent = t(eloTitleKey(entry.elo));
    nameWrap.appendChild(pseudo);
    nameWrap.appendChild(title);
    const elo = document.createElement("span");
    elo.className = "board-elo";
    elo.textContent = entry.elo;
    row.appendChild(rank);
    row.appendChild(img);
    row.appendChild(nameWrap);
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
    return { id: null, pseudo: localPseudo(), skin: "drifter", elo: 1000 };
  }
  return { id: profile.id, pseudo: profile.pseudo, skin: profile.skin, elo: profile.elo };
}

function handleResult(ranked) {
  return function (won, oppElo, stats, oppId) {
    if (getProfile() === null || !netAvailable()) {
      return;
    }
    recordStats(stats, won);
    reportResult(won, ranked, oppElo, oppId).then(function (result) {
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

function startNetDuel(room, ranked, friendly) {
  let onResult = handleResult(ranked);
  if (friendly) {
    onResult = null;
  }
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
    onResult: onResult,
    onExit: backToMenu
  });
  activeDuel.start();
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
  if (friendRoom !== null) {
    friendRoom.cancel();
    friendRoom = null;
    friendCode = null;
    hideInviteButton();
  }
}

function startSearch() {
  el("search-title").textContent = t("searchTitle");
  el("search-timer").classList.remove("hidden");
  el("friend-block").classList.add("hidden");
  ui.showScreen("screen-search");
  ui.searchTick(0);
  let seconds = 0;
  matchmaker = createMatchmaker();
  searchInterval = setInterval(function () {
    seconds += 1;
    ui.searchTick(seconds);
  }, 1000);
  matchmaker.search({
    onMatched: function (room) {
      stopSearch();
      startNetDuel(room, true, false);
    },
    onPairFailed: function () {},
    onError: function () {
      stopSearch();
      ui.showScreen("screen-title");
      alert(t("connectError"));
    }
  });
}

function buildFriendLink(code) {
  const cgLink = inviteLink(code);
  if (cgLink !== null) {
    return cgLink;
  }
  return location.origin + location.pathname + "?duel=" + code;
}

function makeFriendCode() {
  let code = "";
  while (code.length < 6) {
    code += Math.random().toString(36).slice(2);
  }
  return code.slice(0, 6);
}

function openFriendRoom(rawCode, hosting) {
  const code = String(rawCode).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
  if (code.length < 4) {
    ui.showScreen("screen-title");
    return;
  }
  if (hosting) {
    el("search-title").textContent = t("friendWait");
    el("friend-block").classList.remove("hidden");
    el("friend-code").textContent = code.toUpperCase();
    showInviteButton(code);
  } else {
    el("search-title").textContent = t("friendJoining");
    el("friend-block").classList.add("hidden");
  }
  el("search-timer").classList.add("hidden");
  ui.showScreen("screen-search");
  friendCode = code;
  friendRoom = createPrivateRoom(code, {
    onMatched: function (room) {
      friendRoom = null;
      friendCode = null;
      hideInviteButton();
      stopSearch();
      startNetDuel(room, false, true);
    },
    onError: function () {
      stopSearch();
      ui.showScreen("screen-title");
      alert(t("connectError"));
    }
  });
}

el("btn-friend-copy").addEventListener("click", function () {
  if (friendCode === null) {
    return;
  }
  const link = buildFriendLink(friendCode);
  navigator.clipboard.writeText(link).catch(function () {});
  const btn = el("btn-friend-copy");
  btn.textContent = t("friendCopied");
  if (copyTimer !== null) {
    clearTimeout(copyTimer);
  }
  copyTimer = setTimeout(function () {
    copyTimer = null;
    btn.textContent = t("friendCopy");
  }, 1600);
});

el("btn-ranked").addEventListener("click", async function () {
  bootAudio();
  if (!netAvailable()) {
    alert(t("connectError"));
    return;
  }
  const profile = await ensureAccount();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  renderProfileChip();
  startSearch();
});

el("btn-friend").addEventListener("click", function () {
  bootAudio();
  if (!netAvailable()) {
    alert(t("connectError"));
    return;
  }
  ensureAccount().then(renderProfileChip);
  openFriendRoom(makeFriendCode(), true);
});

el("btn-ai").addEventListener("click", function () {
  bootAudio();
  ui.showScreen("screen-opponents");
});

buildOpponentCards();
if (isTouch) {
  document.body.classList.add("touch");
}

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
  let scaled = dt;
  if (activeDuel !== null) {
    scaled = dt * activeDuel.timeScale(now);
  }
  arena.update(scaled);
  cowboy.update(scaled);
  viewmodel.update(scaled);
  if (activeDuel !== null) {
    activeDuel.update(now, scaled);
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
  if (netAvailable() && getProfile() === null && isCrazyGames()) {
    const cgUser = await getCgUser();
    if (cgUser !== null) {
      await ensureAccount();
    }
  }
  renderProfileChip();
  loadingStop();
  let joinCode = getInviteParam("roomId");
  if (joinCode === null) {
    const params = new URLSearchParams(location.search);
    joinCode = params.get("duel");
  }
  if (joinCode !== null && joinCode !== "" && netAvailable()) {
    history.replaceState({}, "", location.pathname);
    ensureAccount().then(renderProfileChip);
    openFriendRoom(joinCode, false);
    return;
  }
  if (isInstantMultiplayer() && netAvailable()) {
    ensureAccount().then(renderProfileChip);
    openFriendRoom(makeFriendCode(), true);
  }
}

ui.showScreen("screen-title");
loop();
boot();
