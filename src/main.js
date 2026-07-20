import * as THREE from "three";
import { createArena } from "./scene.js";
import { createTown } from "./town.js";
import { createCowboy } from "./cowboy.js";
import { createViewmodel } from "./viewmodel.js";
import { createUi } from "./ui.js";
import { AudioEngine } from "./audio.js";
import { createMusic } from "./music.js";
import { AiOpponent, TRAINING_PERSONA } from "./ai.js";
import { restoreStoryBackup, storyProgress, CHAPTERS } from "./story.js";
import { createStoryMode } from "./storymode.js";
import { Gallery } from "./gallery.js";
import { Duel } from "./duel.js";
import { createRng, randomSeed } from "./rng.js";
import { netAvailable, getClient, createMatchmaker, createPrivateRoom, goOnline, isOnline, onlineCount, onlineState, setOnlineState, listenChallenges, listenEvents, sendChallenge, sendChallengeReply, notifyFriendsChange } from "./net.js";
import { getLang, setLang, t, applyStatic, autoTranslate } from "./i18n.js";
import { initSdk, isCrazyGames, isRealCrazyGames, loadingStart, loadingStop, requestMidgameAd, requestRewardedAd, getCgUser, getInviteParam, inviteLink, showInviteButton, hideInviteButton, isInstantMultiplayer, showCgAuthPrompt, submitCgScore, isCgAuthenticated } from "./sdk.js";
import { initAccount, getProfile, ensureAccount, localPseudo, ownedSkins, ownedAccessories, ownedWeaponsSet, isItemUnseen, markItemSeen, equipSkin, equipAccessories, equipWeapon, spinWheel, reportResult, recordStats, claimAdReward, challengeState, claimChallenge, fetchLeaderboard, listFriends, sendFriendRequest, respondFriendRequest, removeFriend, cgFriendsResolved, seasonInfo, passStateFetch, claimPassLevel, adState, adCase, adWatchItem, eventState, eventClaim, storyXp, storyReward, freeDraws, playerLevel, playerLevelProgress } from "./account.js";
import { SKINS, skinById, portraitDataUrl, aiSkinFor, rarityOf, skinRarity } from "./skins.js";
import { ACCESSORIES, accessoryById, accessoryIconDataUrl, accessoryRarity, seasonBadgeInfo, seasonTitleInfo } from "./accessories.js";
import { WEAPONS, weaponById, weaponIconDataUrl } from "./weapons.js";
import { patchNotes, legalPage, creditsPage, LATEST_VERSION } from "./pages.js";
import { renderWantedPosterEl } from "./wanted.js";
import pkg from "../package.json";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const arena = createArena(document.getElementById("game"));
const composer = new EffectComposer(arena.renderer);
const renderPass = new RenderPass(arena.scene, arena.camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), arena.scene, arena.camera);
outlinePass.visibleEdgeColor.set(0xffd700);
outlinePass.hiddenEdgeColor.set(0xffd700);
outlinePass.edgeStrength = 6.0;
outlinePass.edgeThickness = 2.0;
outlinePass.edgeGlow = 0.0;
outlinePass.overlayMaterial.blending = THREE.NormalBlending;
outlinePass.overlayMaterial.needsUpdate = true;
composer.addPass(outlinePass);

window.addEventListener("resize", function() {
  composer.setSize(window.innerWidth, window.innerHeight);
});

const cowboy = createCowboy();
cowboy.group.visible = false;
arena.opponentAnchor.add(cowboy.group);
const playerBody = createCowboy();
playerBody.group.visible = false;
arena.scene.add(playerBody.group);
function fadeThrough(during) {
  const overlay = el("fade-overlay");
  overlay.style.opacity = "1";
  setTimeout(function () {
    during();
    setTimeout(function () {
      overlay.style.opacity = "0";
    }, 60);
  }, 250);
}

const town = createTown(arena, playerBody, fadeThrough, function () {
  audio.doorCreak();
});
const viewmodel = createViewmodel(arena.camera);
const ui = createUi();
const audio = new AudioEngine();
arena.setImpactAudio(audio);
const music = createMusic(audio);
const isTouch = window.matchMedia("(pointer: coarse)").matches;

let activeDuel = null;
let matchmaker = null;
let searchInterval = null;
let searchTransitionTimer = null;
let friendRoom = null;
let friendCode = null;
let pendingChallengeCode = null;
let roomWaitTimer = null;
let trainingActive = false;
let activeMinigame = null;
let copyTimer = null;
let addMsgTimer = null;
let socialReady = false;
let friendsCache = [];
let toastTimer = null;
let spinning = false;
let viewer = null;
let seasonData = null;
let passData = null;
let boardRows = null;
const hadAccount = localStorage.getItem("hn-pseudo") !== null;
let invTab = "skins";

function el(id) {
  return document.getElementById(id);
}

applyStatic();
el("version-tag").textContent = "v" + pkg.version.split(".").slice(0, 2).join(".");

const DESIGN_W = 1160;
const DESIGN_H = 720;
function layoutStage() {
  const stage = el("stage");
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw >= DESIGN_W && vh >= DESIGN_H) {
    document.body.classList.remove("ui-scaled");
    document.body.style.removeProperty("--ui-scale");
    stage.style.transform = "";
    stage.style.width = "";
    stage.style.height = "";
    return;
  }
  const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H);
  document.body.classList.add("ui-scaled");
  document.body.style.setProperty("--ui-scale", scale);
  const w = vw / scale;
  const h = vh / scale;
  stage.style.width = w + "px";
  stage.style.height = h + "px";
  stage.style.transform = "scale(" + scale + ")";
}
layoutStage();
window.addEventListener("resize", layoutStage);
window.addEventListener("orientationchange", layoutStage);

function refreshTownTexts() {
  arena.setTownLabels(t("mgBirdsName"), t("mgCoachName"), t("mgJedName"));
  refreshBoardTexture();
  refreshHomeAd();
}

function showStationBar(hint) {
  const node = el("station-hint");
  node.textContent = hint || "";
  if (hint) {
    node.classList.remove("hidden");
  } else {
    node.classList.add("hidden");
  }
  el("station-bar").classList.remove("hidden");
}

function hideStationBar() {
  el("station-bar").classList.add("hidden");
}

const pickRay = new THREE.Raycaster();
const pickVec = new THREE.Vector2();

function pickInteractable(e) {
  if (!town.isActive() || activeDuel !== null || activeMinigame !== null || town.isBusy()) {
    return null;
  }
  const station = town.currentStation();
  if (station !== "range") {
    return null;
  }
  if (e.target.closest("button")) {
    return null;
  }
  pickVec.x = (e.clientX / window.innerWidth) * 2 - 1;
  pickVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
  pickRay.setFromCamera(pickVec, arena.camera);
  const hits = pickRay.intersectObjects(arena.interactables, false);
  if (hits.length === 0) {
    return null;
  }
  const data = hits[0].object.userData;
  if (data.action === undefined) {
    return null;
  }
  return { data: data, object: hits[0].object };
}

document.addEventListener("click", function (e) {
  const hit = pickInteractable(e);
  if (hit === null) {
    return;
  }
  const data = hit.data;
  bootAudio();
  audio.uiClick();
  if (data.action === "birds") {
    hideStationBar();
    startGallery("birds", null);
  } else if (data.action === "coach") {
    hideStationBar();
    startGallery("coach", null);
  } else if (data.action === "oldjed") {
    hideStationBar();
    startOldJedDuel();
  }
});

let lastHoverHint = "";
document.addEventListener("mousemove", function (e) {
  if (activeDuel !== null || activeMinigame !== null) {
    outlinePass.selectedObjects = [];
    return;
  }
  const hit = pickInteractable(e);
  if (hit !== null) {
    document.documentElement.classList.add("cursor-crosshair");
    const target = hit.data.root || hit.object;
    outlinePass.selectedObjects = [target];
    if (town.currentStation() === "range") {
      let hint = t("mgHint");
      if (hit.data.action === "birds") hint = t("mgHintBirds");
      else if (hit.data.action === "coach") hint = t("mgHintCoach");
      else if (hit.data.action === "oldjed") hint = t("mgHintJed");
      if (hint !== lastHoverHint) {
        lastHoverHint = hint;
        showStationBar(hint);
      }
    }
  } else {
    document.documentElement.classList.remove("cursor-crosshair");
    outlinePass.selectedObjects = [];
    if (town.currentStation() === "range" && lastHoverHint !== t("mgHint")) {
      lastHoverHint = t("mgHint");
      showStationBar(lastHoverHint);
    }
  }
});

const langSelect = el("lang-select");
langSelect.value = getLang();
langSelect.addEventListener("change", function () {
  setLang(langSelect.value);
  applyStatic();
  refreshTownTexts();
  renderProfileChip();
  renderFriends();
  updatePlayersOnline();
  renderChallenges();
  if (eventData !== null) renderEventBanner(eventData);
  if (!el("screen-patch").classList.contains("hidden")) {
    renderPatchNotes();
  }
});

const musicSlider = el("vol-music");
const sfxSlider = el("vol-sfx");
const MUSIC_MID = 0.6;
const SFX_MID = 0.9;
musicSlider.value = String(Math.round(audio.musicVolume / MUSIC_MID * 50));
sfxSlider.value = String(Math.round(audio.sfxVolume / SFX_MID * 50));
musicSlider.addEventListener("input", function () {
  audio.setMusicVolume(Number(musicSlider.value) / 50 * MUSIC_MID);
});
sfxSlider.addEventListener("input", function () {
  audio.setSfxVolume(Number(sfxSlider.value) / 50 * SFX_MID);
});

let audioBooted = false;
let menuMusicAllowed = false;
function bootAudio() {
  if (audioBooted) {
    audio.ensure();
    return;
  }
  audioBooted = true;
  audio.ensure();
  maybeStartMenuMusic();
}
function maybeStartMenuMusic() {
  if (audioBooted && menuMusicAllowed && activeDuel === null) {
    music.start();
  }
}
document.addEventListener("pointerdown", bootAudio, { once: true, capture: true });
document.addEventListener("touchstart", bootAudio, { once: true, capture: true, passive: true });
document.addEventListener("mousedown", bootAudio, { once: true, capture: true });
document.addEventListener("click", bootAudio, { once: true, capture: true });
document.addEventListener("keydown", bootAudio, { once: true, capture: true });

document.addEventListener("click", function (e) {
  if (!audioBooted || activeDuel !== null) {
    return;
  }
  const hit = e.target.closest(".btn, .ch-tab, .friend-btn");
  if (hit !== null && !hit.disabled) {
    audio.uiClick();
  }
});

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

let isAdPlaying = false;
function adMuteOn() {
  isAdPlaying = true;
  if (audio.ctx !== null) {
    audio.ctx.suspend();
  }
}

function adMuteOff() {
  isAdPlaying = false;
  if (audio.ctx !== null) {
    audio.ctx.resume();
  }
}

function showToast(text, onAccept, onDecline, durationMs = 6000, onTimeout = null) {
  const toast = el("toast");
  el("toast-text").textContent = text;
  if (onAccept) {
    el("toast-accept").classList.remove("hidden");
    el("toast-decline").classList.remove("hidden");
    el("toast-accept").onclick = function () {
      hideToast();
      onAccept();
    };
    el("toast-decline").onclick = function () {
      hideToast();
      if (onDecline) onDecline();
    };
  } else {
    el("toast-accept").classList.add("hidden");
    el("toast-decline").classList.add("hidden");
  }
  toast.classList.remove("hidden");
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(function () {
    hideToast();
    if (onTimeout) {
      onTimeout();
    }
  }, durationMs);
}

function hideToast() {
  el("toast").classList.add("hidden");
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

const popupQueue = [];
let popupOpen = false;
let currentPopup = null;

function showPopup(title, html, onClose) {
  popupQueue.push({ title: title, html: html, onClose: onClose || null });
  if (!popupOpen) {
    nextPopup();
  }
}

function nextPopup() {
  const prev = currentPopup;
  currentPopup = null;
  const item = popupQueue.shift();
  if (item === undefined) {
    popupOpen = false;
    el("popup-overlay").classList.add("hidden");
  } else {
    currentPopup = item;
    popupOpen = true;
    el("popup-title").textContent = item.title;
    el("popup-body").innerHTML = item.html;
    el("popup-overlay").classList.remove("hidden");
  }
  if (prev !== null && prev.onClose !== null) {
    prev.onClose();
  }
}

el("btn-popup-ok").addEventListener("click", function () {
  bootAudio();
  audio.uiClick();
  nextPopup();
});

function maybeShowNotesPopup() {
  const seen = localStorage.getItem("hn-notes-seen");
  if (seen === LATEST_VERSION) {
    return;
  }
  localStorage.setItem("hn-notes-seen", LATEST_VERSION);
  if (!hadAccount) {
    return;
  }
  const entry = patchNotes(getLang())[0];
  let html = '<ul class="popup-list">';
  for (const item of entry.items) {
    html += "<li>" + item + "</li>";
  }
  html += "</ul>";
  showPopup(t("notesTitle") + " - v" + entry.version, html);
}

function maybeShowSeasonPopup() {
  if (seasonData === null) {
    return;
  }
  let html = "";
  if (seasonData.prev && Number.isFinite(Number(seasonData.prev.prime))) {
    html += "<p>" + t("seasonPopupBody", { s: seasonData.prev.season, r: seasonData.prev.rank }) + "</p>";
    html += '<div class="popup-prime">' + seasonData.prev.prime + " $</div>";
    html += "<p>" + t("seasonPopupNow", { s: seasonData.season }) + "</p>";
  }
  if (seasonData.badge) {
    const titleId = "title-s" + seasonData.badge.season + "-r" + seasonData.badge.rank;
    html += '<img class="popup-badge" src="' + accessoryIconDataUrl(titleId, 96) + '" alt="" />';
    html += "<p>" + t("badgeCongrats", { r: seasonData.badge.rank, s: seasonData.badge.season }) + "</p>";
  }
  if (html === "") {
    return;
  }
  showPopup(t("seasonPopupTitle"), html);
}

function refreshTownCharacter() {
  const profile = getProfile();
  if (profile === null) {
    playerBody.setSkin(skinById("drifter").colors);
    playerBody.setOutfit(skinById("drifter").outfit || null);
    playerBody.setAccessories([]);
    playerBody.setWeapon(weaponById("iron").colors);
    return;
  }
  playerBody.setSkin(skinById(profile.skin).colors);
  playerBody.setOutfit(skinById(profile.skin).outfit || null);
  playerBody.setAccessories(profile.accessories);
  playerBody.setWeapon(weaponById(profile.weapon).colors);
}

function goStation(name, onArrived) {
  bootAudio();
  ui.showScreen(null);
  town.setActive(true);
  town.goTo(name, onArrived);
}

function leaveStation() {
  ui.showScreen(null);
  hideStationBar();
  refreshPassNotif();
  town.goHome(false, function () {
    ui.showScreen("screen-title");
  });
}

function returnToMenu() {
  hideStationBar();
  refreshPassNotif();
  town.goHome(true, function () {});
  ui.showScreen("screen-title");
}

function refreshPassNotif() {
  if (getProfile() === null) {
    return;
  }
  passStateFetch().then(function (d) {
    if (d !== null) {
      passData = d;
      setDot("btn-pass", passHasClaimable());
    }
  }).catch(function () {});
}

function prepDuelScene() {
  town.setActive(false);
  hideStationBar();
  playerBody.group.visible = false;
  cowboy.group.visible = true;
  cowboy.reset();
  arena.playerRig.position.set(0, 1.6, 7);
  arena.camera.position.set(0, 0, 0);
  arena.camera.rotation.set(0, 0, 0);
  arena.camera.fov = 70;
  arena.camera.updateProjectionMatrix();
}

let lastLevel = null;

const LVL_HOLE_SPOTS = {
  "0": [25, 50],
  "1": [50, 46],
  "2": [52, 30],
  "3": [58, 33],
  "4": [58, 56],
  "5": [46, 27],
  "6": [44, 60],
  "7": [54, 24],
  "8": [50, 30],
  "9": [56, 33]
};

const LVL_HOLE_SVG =
  '<svg viewBox="0 0 48 48"><path d="M24 3 L27 15 L35 7 L31 18 L44 16 L33 23 L46 29 L32 28 L39 42 L27 31 L25 46 L21 33 L9 42 L16 29 L2 31 L14 23 L4 14 L17 18 L12 5 L22 15 Z" fill="#181209"></path><circle cx="24" cy="24" r="7.5" fill="#060402"></circle></svg>';

function lvlHoleSpot(fromStr) {
  const digit = fromStr[fromStr.length - 1];
  const aim = LVL_HOLE_SPOTS[digit] || [50, 40];
  const fallback = [((fromStr.length - 1 + aim[0] / 100) / fromStr.length) * 100, aim[1]];
  const S = 100;
  const canvas = document.createElement("canvas");
  canvas.width = 170;
  canvas.height = 210;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return fallback;
  }
  ctx.font = S + 'px Rye, "Special Elite", serif';
  const metrics = ctx.measureText(digit);
  const adv = Math.max(1, metrics.width);
  const fbA = metrics.fontBoundingBoxAscent !== undefined ? metrics.fontBoundingBoxAscent : S * 0.8;
  const fbD = metrics.fontBoundingBoxDescent !== undefined ? metrics.fontBoundingBoxDescent : S * 0.2;
  const padX = 30;
  const baseY = 50 + fbA;
  ctx.fillText(digit, padX, baseY);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const boxTop = baseY - fbA - (S - fbA - fbD) / 2;
  const aimX = padX + (aim[0] / 100) * adv;
  const aimY = boxTop + (aim[1] / 100) * S;
  let bestX = -1;
  let bestY = -1;
  let bestD = Infinity;
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      if (img[(py * canvas.width + px) * 4 + 3] > 120) {
        const d = (px - aimX) * (px - aimX) + (py - aimY) * (py - aimY);
        if (d < bestD) {
          bestD = d;
          bestX = px;
          bestY = py;
        }
      }
    }
  }
  if (bestX < 0) {
    return fallback;
  }
  if (bestD > 1) {
    const len = Math.sqrt(bestD);
    const ux = (bestX - aimX) / len;
    const uy = (bestY - aimY) / len;
    for (let s = 1; s <= 7; s++) {
      const nx = Math.round(bestX + ux * s);
      const ny = Math.round(bestY + uy * s);
      if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) {
        break;
      }
      if (img[(ny * canvas.width + nx) * 4 + 3] <= 120) {
        break;
      }
      bestX = nx;
      bestY = ny;
    }
  }
  const totalW = fromStr.length > 1 ? Math.max(adv, ctx.measureText(fromStr).width) : adv;
  const left = ((totalW - adv + (bestX - padX)) / totalW) * 100;
  const top = ((bestY - boxTop) / S) * 100;
  return [Math.max(2, Math.min(98, left)), Math.max(2, Math.min(98, top))];
}

function playLevelUp(from, to) {
  if (window.levelUpBusy) {
    return;
  }
  window.levelUpBusy = true;
  if (document.activeElement) {
    document.activeElement.blur();
  }
  const overlay = el("levelup");
  overlay.style.pointerEvents = "auto";
  const oldNum = el("lvl-old");
  const newNum = el("lvl-new");
  const fromStr = String(from);
  const spot = lvlHoleSpot(fromStr);
  const holeTilt = Math.round(Math.random() * 90 - 45);
  el("lvl-old-num").innerHTML = fromStr +
    '<span class="lvl-hole hidden" id="lvl-hole" style="left:' + spot[0] + "%;top:" + spot[1] + "%;--hr:" + holeTilt + 'deg">' +
    LVL_HOLE_SVG + "</span>";
  newNum.textContent = String(to);
  oldNum.className = "lvl-num";
  newNum.className = "lvl-num lvl-wait";
  el("lvl-dust").classList.remove("burst");
  overlay.classList.remove("fade");
  overlay.classList.remove("hidden");
  setTimeout(function () {
    audio.levelShot();
    el("lvl-hole").classList.remove("hidden");
    oldNum.classList.add("shot");
  }, 1000);
  setTimeout(function () {
    newNum.classList.remove("lvl-wait");
    newNum.classList.add("drop");
  }, 1300);
  setTimeout(function () {
    audio.levelLand();
    el("lvl-dust").classList.add("burst");
  }, 1660);
  setTimeout(function () {
    overlay.classList.add("fade");
  }, 3100);
  setTimeout(function () {
    overlay.classList.add("hidden");
    window.levelUpBusy = false;
    overlay.style.pointerEvents = "";
  }, 3500);
}

function checkLevelUp(profile) {
  if (profile === null) {
    return;
  }
  const level = playerLevel(profile.xp);
  if (lastLevel !== null && level > lastLevel && !window.levelUpBusy) {
    playLevelUp(lastLevel, level);
  }
  lastLevel = level;
}

function renderProfileChip() {
  const profile = getProfile();
  refreshTownCharacter();
  const chip = el("profile-chip");
  if (profile !== null) {
    el("chip-head").src = portraitDataUrl(profile.skin, 128, profile.accessories, profile.weapon);
    el("chip-pseudo").textContent = profile.pseudo;
    checkLevelUp(profile);
    if (isCrazyGames()) {
      isCgAuthenticated().then(function(auth) {
        if (!auth) {
          el("btn-cg-login").classList.remove("hidden");
        } else {
          el("btn-cg-login").classList.add("hidden");
        }
      });
    } else {
      el("btn-cg-login").classList.add("hidden");
    }
  } else {
    el("chip-head").src = portraitDataUrl("drifter", 128);
    el("chip-pseudo").textContent = localPseudo();
  }
  chip.classList.remove("hidden");
  refreshCoins();
  updateNotifs();
}

function setDot(id, on) {
  const node = el(id);
  if (node !== null) {
    node.classList.toggle("has-notif", !!on);
  }
}

function claimableLevels() {
  if (passData === null || !Array.isArray(passData.rewards)) {
    return [];
  }
  const profile = getProfile();
  let xp = Number(passData.xp) || 0;
  if (profile !== null && Number(profile.xp) > xp) {
    xp = Number(profile.xp);
  }
  const claimed = passData.claimed || [];
  const out = [];
  for (let i = 1; i <= 30; i++) {
    if (xp >= i * 200 && claimed.indexOf(i) === -1) {
      out.push(i);
    }
  }
  return out;
}

function passSeenLevels() {
  try {
    const raw = localStorage.getItem("hn-pass-seen");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function passHasClaimable() {
  const seen = passSeenLevels();
  return claimableLevels().some(function (level) {
    return seen.indexOf(level) === -1;
  });
}

function markPassSeen() {
  try {
    localStorage.setItem("hn-pass-seen", JSON.stringify(claimableLevels()));
  } catch (e) {}
}

function seenNum(key) {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  } catch (e) {
    return 0;
  }
}

function setSeenNum(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {}
}

function seenBaseline(key, current) {
  const seen = seenNum(key);
  if (seen > current) {
    setSeenNum(key, current);
    return current;
  }
  return seen;
}

function adCaseLeft() {
  return adShopData !== null ? Number(adShopData.case_left) || 0 : 0;
}

function markShopSeen() {
  setSeenNum("hn-freedraw-seen", freeDraws());
  setSeenNum("hn-adcase-seen", adCaseLeft());
}

function isPosterSlot(slot) {
  return String(slot || "").indexOf("poster") === 0;
}

function unseenSkinIds() {
  return Array.from(ownedSkins()).filter(function (id) {
    return isItemUnseen("skin", id);
  });
}

function unseenWeaponIds() {
  return Array.from(ownedWeaponsSet()).filter(function (id) {
    return isItemUnseen("weapon", id);
  });
}

function unseenAccIds(wantPoster) {
  return Array.from(ownedAccessories()).filter(function (id) {
    if (!isItemUnseen("accessory", id)) {
      return false;
    }
    const acc = accessoryById(id);
    const slot = acc === null ? "other" : acc.slot;
    return isPosterSlot(slot) === wantPoster;
  });
}

function markSeenIds(kind, ids) {
  for (const id of ids) {
    markItemSeen(kind, id);
  }
  if (ids.length > 0) {
    updateNotifs();
  }
}

function markInvTabSeen(tab) {
  if (tab === "skins") {
    markSeenIds("skin", unseenSkinIds());
  } else if (tab === "weapons") {
    markSeenIds("weapon", unseenWeaponIds());
  } else if (tab === "acc") {
    markSeenIds("accessory", unseenAccIds(false));
  }
}

function markPosterCatSeen() {
  const cat = POSTER_CATS.find(function (c) { return c.slot === posterCat; }) || POSTER_CATS[0];
  const slots = cat.group || [cat.slot];
  markSeenIds("accessory", unseenAccIds(true).filter(function (id) {
    const acc = accessoryById(id);
    return acc !== null && slots.indexOf(acc.slot) !== -1;
  }));
}

function pendingIncoming() {
  return friendsCache.filter(function (e) {
    return e && e.incoming && e.status === "pending";
  });
}

function friendReqSeenSet() {
  try {
    const raw = localStorage.getItem("hn-friendreq-seen");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function markFriendReqsSeen() {
  const ids = pendingIncoming().map(function (e) { return e.fid; });
  try {
    localStorage.setItem("hn-friendreq-seen", JSON.stringify(ids));
  } catch (e) {}
}

function friendReqIsNew(entry) {
  return entry && entry.incoming && entry.status === "pending" && friendReqSeenSet().indexOf(entry.fid) === -1;
}

function friendsHaveIncoming() {
  const seen = friendReqSeenSet();
  return pendingIncoming().some(function (e) {
    return seen.indexOf(e.fid) === -1;
  });
}

function storyHasNew() {
  const raw = localStorage.getItem("hn-story-seen");
  const seen = raw === null || raw === "" ? -1 : Number(raw);
  const prog = storyProgress();
  return prog < CHAPTERS.length && prog > (Number.isFinite(seen) ? seen : -1);
}

let notifPassChecked = false;

function updateNotifs() {
  const newSkins = unseenSkinIds().length > 0;
  const newWeapons = unseenWeaponIds().length > 0;
  const newAcc = unseenAccIds(false).length > 0;
  const newPoster = unseenAccIds(true).length > 0;
  const invNew = newSkins || newWeapons || newAcc;
  setDot("inv-tab-skins", newSkins);
  setDot("inv-tab-weapons", newWeapons);
  setDot("inv-tab-acc", newAcc);
  setDot("btn-customize", invNew);
  setDot("btn-poster-edit", newPoster);
  setDot("profile-chip", invNew || newPoster);
  setDot("btn-story", storyHasNew());
  const free = freeDraws();
  const cases = adCaseLeft();
  const freeDraw = free > seenBaseline("hn-freedraw-seen", free);
  const adDraw = cases > seenBaseline("hn-adcase-seen", cases);
  setDot("btn-shop", freeDraw || adDraw);
  setDot("btn-spin", freeDraw);
  setDot("btn-ad-case", adDraw);
  setDot("btn-friends", friendsHaveIncoming());
  setDot("btn-pass", passHasClaimable());
  if (passData === null && getProfile() !== null && !notifPassChecked) {
    notifPassChecked = true;
    passStateFetch().then(function (d) {
      if (d !== null) {
        passData = d;
        setDot("btn-pass", passHasClaimable());
      } else {
        notifPassChecked = false;
      }
    }).catch(function () {
      notifPassChecked = false;
    });
  }
}

const MAX_LEVEL = 6;

function refreshCoins() {
  const profile = getProfile();
  const badges = el("hud-badges");
  if (profile === null || activeDuel !== null || activeMinigame !== null || storyMode.isActive()) {
    badges.classList.add("hidden");
    return;
  }
  el("coins-value").textContent = String(profile.coins);
  const lvl = playerLevel(profile.xp);
  el("level-value").textContent = String(Math.min(lvl, MAX_LEVEL));
  if (lvl >= MAX_LEVEL) {
    el("level-xp").textContent = "MAX";
  } else {
    const prog = playerLevelProgress(profile.xp);
    el("level-xp").textContent = prog.current + "/" + prog.next;
  }
  badges.classList.remove("hidden");
}

async function accountReady() {
  if (!netAvailable()) {
    return null;
  }
  if (getProfile() === null) {
    el("profile-chip").classList.add("loading");
    el("profile-chip").classList.remove("hidden");
  }
  const profile = await ensureAccount();
  el("profile-chip").classList.remove("loading");
  if (profile !== null) {
    renderProfileChip();
    initSocial();
    checkBanned();
  }
  return profile;
}

function checkBanned() {
  const p = getProfile();
  const overlay = el("ban-overlay");
  if (overlay === null) {
    return false;
  }
  if (p !== null && p.banned) {
    el("ban-title").textContent = t("bannedTitle");
    el("ban-reason").textContent = p.ban_reason || "";
    overlay.classList.remove("hidden");
    return true;
  }
  overlay.classList.add("hidden");
  return false;
}

function mountViewer(containerId) {
  const container = el(containerId);
  if (viewer === null) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    cam.position.set(0, 1.15, 3.3);
    cam.lookAt(0, 0.92, 0);
    const hemi = new THREE.HemisphereLight(0xffe8c0, 0x5a4326, 1.2);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff2d8, 1.8);
    dir.position.set(2, 4, 3);
    scene.add(dir);
    const model = createCowboy();
    if (model.gun) {
      model.gun.rotation.x = Math.PI / 2;
      model.gun.position.set(0.02, -0.66, 0);
    }
    scene.add(model.group);
    viewer = { renderer: renderer, scene: scene, cam: cam, model: model, host: null };
  }
  if (viewer.host !== container) {
    container.appendChild(viewer.renderer.domElement);
    viewer.host = container;
  }
  const w = Math.max(1, container.clientWidth);
  const h = Math.max(1, container.clientHeight);
  viewer.renderer.setSize(w, h);
  viewer.cam.aspect = w / h;
  viewer.cam.updateProjectionMatrix();
  return viewer;
}

function updateViewer(dt) {
  if (viewer === null || viewer.host === null) {
    return;
  }
  const profileOpen = !el("screen-profile").classList.contains("hidden");
  const invOpen = !el("screen-inventory").classList.contains("hidden");
  if (!profileOpen && !invOpen) {
    return;
  }
  viewer.model.group.rotation.y += dt * 0.9;
  viewer.model.update(dt);
  viewer.renderer.render(viewer.scene, viewer.cam);
}

function refreshViewerModel() {
  refreshTownCharacter();
  const profile = getProfile();
  if (viewer === null || profile === null) {
    return;
  }
  viewer.model.setSkin(skinById(profile.skin).colors);
  viewer.model.setOutfit(skinById(profile.skin).outfit || null);
  viewer.model.setAccessories(profile.accessories);
  viewer.model.setWeapon(weaponById(profile.weapon).colors);
}

function statRow(container, label, value) {
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("span");
  valueNode.className = "stat-value";
  valueNode.textContent = value;
  container.appendChild(labelNode);
  container.appendChild(valueNode);
}

function accName(acc) {
  if (acc.badge) {
    return "TOP " + acc.badge.rank + " - " + t("seasonLabel") + " " + acc.badge.season;
  }
  if (acc.title) {
    return "TOP " + acc.title.rank + " - " + t("seasonLabel") + " " + acc.title.season;
  }
  return t(acc.nameKey);
}

function renderStatsBlock(profileArg) {
  const profile = profileArg || getProfile();
  const block = el("stats-block");
  block.innerHTML = "";

  const progress = playerLevelProgress(profile.xp);
  statRow(block, t("statsLevel"), playerLevel(profile.xp) + " - " + progress.current + "/" + progress.next + " XP");
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

function renderCareer() {
  const idNode = el("profile-id");
  const profile = getProfile();
  idNode.textContent = "ID: " + (profile !== null && profile.friend_code ? profile.friend_code : "----");
  const block = el("career-block");
  block.innerHTML = "";
  const title = el("career-title");
  if (seasonData === null || !Array.isArray(seasonData.history) || seasonData.history.length === 0) {
    title.classList.add("hidden");
    block.classList.add("hidden");
    return;
  }
  title.classList.remove("hidden");
  block.classList.remove("hidden");
  for (const entry of seasonData.history.slice(0, 6)) {
    statRow(block, t("seasonLabel") + " " + entry.season, entry.prime + " $");
  }
}

function invItem(iconUrl, name, equipped, locked, onClick, rarity, isNew = false) {
  const item = document.createElement("div");
  item.className = "inv-item";
  if (rarity) {
    item.classList.add("rarity-" + rarity);
  }
  if (equipped) {
    item.classList.add("equipped");
  }
  if (locked) {
    item.classList.add("locked");
  }
  if (isNew) {
    item.classList.add("is-new");
    const badge = document.createElement("div");
    badge.className = "notif-badge";
    item.appendChild(badge);
  }
  const img = document.createElement("img");
  img.src = iconUrl;
  const label = document.createElement("div");
  label.className = "inv-name";
  label.textContent = name;
  item.appendChild(img);
  item.appendChild(label);
  if (!locked) {
    item.onclick = function () {
      if (isNew) {
        item.classList.remove("is-new");
        const b = item.querySelector(".notif-badge");
        if (b) b.remove();
      }
      onClick();
    };
  }
  return item;
}

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

function sortByRarity(list, rarityFn) {
  return list.slice().sort(function (a, b) {
    return (RARITY_ORDER[rarityFn(a)] || 0) - (RARITY_ORDER[rarityFn(b)] || 0);
  });
}

function equippedAccList() {
  const profile = getProfile();
  if (Array.isArray(profile.accessories)) {
    return profile.accessories.slice();
  }
  return [];
}

function setInvTab(tab) {
  invTab = tab;
  el("inv-tab-skins").classList.toggle("active", tab === "skins");
  el("inv-tab-weapons").classList.toggle("active", tab === "weapons");
  el("inv-tab-acc").classList.toggle("active", tab === "acc");
  el("inv-skins").classList.toggle("hidden", tab !== "skins");
  el("inv-weapons").classList.toggle("hidden", tab !== "weapons");
  el("inv-acc").classList.toggle("hidden", tab !== "acc");
  playerBody.holdGun(tab === "weapons");
}

function renderInventory() {
  const profile = getProfile();
  const owned = ownedSkins();
  const ownedAcc = ownedAccessories();
  const ownedWp = ownedWeaponsSet();
  const skinsRow = el("inv-skins");
  skinsRow.innerHTML = "";
  for (const skin of sortByRarity(SKINS, skinRarity)) {
    const isOwned = owned.has(skin.id);
    if (!isOwned) {
      continue;
    }
    const isNew = isOwned && isItemUnseen("skin", skin.id);
    const isEquipped = profile.skin === skin.id;
    skinsRow.appendChild(invItem(portraitDataUrl(skin.id, 88), t(skin.nameKey), isEquipped, !isOwned, async function () {
      if (isEquipped) {
        return;
      }
      audio.equip();
      await equipSkin(skin.id);
      renderProfileChip();
      renderInventory();
      refreshViewerModel();
      patchBoardRow();
    }, skinRarity(skin), isNew));
  }
  const weaponRow = el("inv-weapons");
  weaponRow.innerHTML = "";
  for (const weapon of sortByRarity(WEAPONS, function (w) { return rarityOf(w.price); })) {
    const isOwned = ownedWp.has(weapon.id);
    if (!isOwned) {
      continue;
    }
    const isNew = isOwned && isItemUnseen("weapon", weapon.id);
    const isEquipped = profile.weapon === weapon.id;
    weaponRow.appendChild(invItem(weaponIconDataUrl(weapon.id, 88), t(weapon.nameKey), isEquipped, !isOwned, async function () {
      if (isEquipped) {
        return;
      }
      audio.equip();
      await equipWeapon(weapon.id);
      renderProfileChip();
      renderInventory();
      refreshViewerModel();
      patchBoardRow();
    }, rarityOf(weapon.price), isNew));
  }
  const accRow = el("inv-acc");
  accRow.innerHTML = "";
  const equipped = equippedAccList();

  const accGroups = {};
  for (const acc of ACCESSORIES) {
    const s = acc.slot || "other";
    if (!accGroups[s]) {
      accGroups[s] = [];
    }
    accGroups[s].push(acc);
  }

  for (const slot in accGroups) {
    if (slot.indexOf("poster") === 0) {
      continue;
    }
    const grid = document.createElement("div");
    grid.className = "inv-grid";
    grid.style.marginBottom = "20px";
    const slotName = slot;
    const slotAccs = sortByRarity(accGroups[slot], function (a) { return accessoryRarity(a.id); });
    const slotAccsOwned = slotAccs.filter(acc => ownedAcc.has(acc.id));
    if (slotAccsOwned.length === 0) {
      continue;
    }
    const slotHasEquipped = slotAccsOwned.some(function (a) {
      return equipped.indexOf(a.id) !== -1;
    });
    grid.appendChild(invItem(noneIcon(), t("posterNone"), !slotHasEquipped, false, async function () {
      if (!slotHasEquipped) {
        return;
      }
      const next = equippedAccList().filter(function (id) {
        const other = accessoryById(id);
        return other === null || other.slot !== slotName;
      });
      audio.equip();
      await equipAccessories(next);
      renderProfileChip();
      renderInventory();
      refreshViewerModel();
      patchBoardRow();
    }));
    for (const acc of slotAccsOwned) {
      const isOwned = true;
      const isNew = isOwned && isItemUnseen("accessory", acc.id);
      const isEquipped = equipped.indexOf(acc.id) !== -1;
      grid.appendChild(invItem(accessoryIconDataUrl(acc.id, 88), accName(acc), isEquipped, !isOwned, async function () {
        let next = equippedAccList();
        if (isEquipped) {
          return;
        } else {
          next = next.filter(function (id) {
            const other = accessoryById(id);
            return other === null || other.slot !== acc.slot;
          });
          next.push(acc.id);
        }
        audio.equip();
        await equipAccessories(next);
        renderProfileChip();
        renderInventory();
        refreshViewerModel();
        patchBoardRow();
      }, accessoryRarity(acc.id), isNew));
    }
    accRow.appendChild(grid);
  }
  setInvTab(invTab);
}

el("inv-tab-skins").addEventListener("click", function () {
  setInvTab("skins");
  markInvTabSeen("skins");
});

el("inv-tab-weapons").addEventListener("click", function () {
  setInvTab("weapons");
  markInvTabSeen("weapons");
});

el("inv-tab-acc").addEventListener("click", function () {
  setInvTab("acc");
  markInvTabSeen("acc");
});

function centerCustomizeButton() {
  if (!arena || !arena.camera) {
    return;
  }
  const v = new THREE.Vector3();
  playerBody.group.updateWorldMatrix(true, false);
  playerBody.group.getWorldPosition(v);
  v.y += 0.9;
  arena.camera.updateMatrixWorld();
  v.project(arena.camera);
  let pct = (v.x * 0.5 + 0.5) * 100;
  pct = Math.max(8, Math.min(48, pct));
  el("btn-customize").style.left = pct + "%";
}

async function openProfile() {
  bootAudio();
  audio.uiClick();
  const profile = await accountReady();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  viewingFriend = false;
  el("screen-profile").classList.remove("viewing-friend");
  el("profile-name").textContent = profile.pseudo;
  renderWantedPosterEl(el("profile-poster"), {
    pseudo: profile.pseudo,
    title: profile.prime + " $",
    skin: profile.skin,
    acc: profile.accessories,
    weapon: profile.weapon,
    width: 250
  });
  renderStatsBlock();
  renderCareer();
  el("screen-profile").classList.remove("editing");
  el("poster-editor").classList.add("hidden");
  goStation("profile", function () {
    ui.showScreen("screen-profile");
    requestAnimationFrame(centerCustomizeButton);
  });
}

el("btn-copy-id").addEventListener("click", function () {
  audio.uiClick();
  let codeStr = el("profile-id").textContent;
  if (codeStr.startsWith("ID: ")) codeStr = codeStr.substring(4).trim();
  if (!codeStr || codeStr === "----") return;
  navigator.clipboard.writeText(codeStr).catch(function () {});
  el("btn-copy-id").textContent = t("copiedId");
  setTimeout(function () {
    el("btn-copy-id").textContent = t("copyId");
  }, 1600);
});

let invRotation = -0.5;
function openInventory() {
  invRotation = -0.5;
  playerBody.group.rotation.y = invRotation;
  el("inv-rotation").value = 0;
  updateNotifs();
  renderInventory();
  ui.showScreen("screen-inventory");
  markInvTabSeen(invTab);
}

el("inv-rotation").addEventListener("input", function () {
  const angle = parseInt(this.value, 10);
  playerBody.group.rotation.y = -0.5 + (angle * Math.PI / 180);
});

el("profile-chip").addEventListener("click", openProfile);
el("btn-customize").addEventListener("click", openInventory);
el("btn-inv-back").addEventListener("click", function () {
  invRotation = -0.5;
  playerBody.group.rotation.y = -0.5;
  playerBody.holdGun(false);
  ui.showScreen("screen-profile");
  const profile = getProfile();
  if (profile !== null) {
    el("profile-name").textContent = profile.pseudo;
    renderWantedPosterEl(el("profile-poster"), {
      pseudo: profile.pseudo,
      title: profile.prime + " $",
      skin: profile.skin,
      acc: profile.accessories,
      weapon: profile.weapon,
      width: 250
    });
  }
});

let viewingFriend = false;

function openFriendProfile(entry) {
  bootAudio();
  audio.uiClick();
  viewingFriend = true;
  el("friends-bar").classList.remove("open");
  el("profile-name").textContent = entry.pseudo;
  renderWantedPosterEl(el("profile-poster"), {
    pseudo: entry.pseudo,
    title: (entry.prime != null ? entry.prime : 0) + " $",
    skin: entry.skin || "drifter",
    acc: entry.accessories || [],
    weapon: entry.weapon || "iron",
    width: 250
  });
  renderStatsBlock(entry);
  el("profile-id").textContent = "ID: " + (entry.friend_code || "----");
  el("career-title").classList.add("hidden");
  el("career-block").classList.add("hidden");
  el("screen-profile").classList.remove("editing");
  el("poster-editor").classList.add("hidden");
  el("screen-profile").classList.add("viewing-friend");
  fadeThrough(function () {
    const fskin = skinById(entry.skin || "drifter");
    playerBody.setSkin(fskin.colors);
    playerBody.setOutfit(fskin.outfit || null);
    playerBody.setAccessories(entry.accessories || []);
    playerBody.setWeapon(weaponById(entry.weapon || "iron").colors);
    town.warpTo("profile");
    ui.showScreen("screen-profile");
  });
}

el("btn-profile-back").addEventListener("click", function () {
  if (viewingFriend) {
    fadeThrough(function () {
      viewingFriend = false;
      el("screen-profile").classList.remove("viewing-friend");
      refreshTownCharacter();
      returnToMenu();
      el("friends-bar").classList.add("open");
    });
    return;
  }
  leaveStation();
});

const POSTER_CATS = [
  { slot: "posterstyle", key: "posterCatStyle", group: ["posterpaper", "posterstamp", "posterink"] },
  { slot: "posterpose", key: "posterCatPose" },
  { slot: "posternick", key: "posterCatNick" }
];
let posterCat = "posterstyle";
let noneIconUrl = null;

function noneIcon() {
  if (noneIconUrl !== null) {
    return noneIconUrl;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#8a6a3c";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(48, 48, 26, 0, Math.PI * 2);
  ctx.moveTo(30, 66);
  ctx.lineTo(66, 30);
  ctx.stroke();
  noneIconUrl = canvas.toDataURL();
  return noneIconUrl;
}

function renderPosterPreview() {
  const profile = getProfile();
  if (profile === null) {
    return;
  }
  renderWantedPosterEl(el("profile-poster"), {
    pseudo: profile.pseudo,
    title: profile.prime + " $",
    skin: profile.skin,
    acc: profile.accessories,
    weapon: profile.weapon,
    width: 250
  });
}

function renderPosterTabs() {
  const tabs = el("poster-tabs");
  tabs.innerHTML = "";
  for (const cat of POSTER_CATS) {
    const btn = document.createElement("button");
    btn.className = "ch-tab" + (cat.slot === posterCat ? " active" : "");
    btn.textContent = t(cat.key);
    const catSlots = cat.group || [cat.slot];
    const catNew = unseenAccIds(true).some(function (id) {
      const acc = accessoryById(id);
      return acc !== null && catSlots.indexOf(acc.slot) !== -1;
    });
    if (catNew) {
      btn.classList.add("has-notif");
    }
    btn.addEventListener("click", function () {
      posterCat = cat.slot;
      audio.uiClick();
      renderPosterTabs();
      renderPosterEditor();
      markPosterCatSeen();
    });
    tabs.appendChild(btn);
  }
}

function posterSlotGrid(slot) {
  const ownedAcc = ownedAccessories();
  const equipped = equippedAccList();
  const grid = document.createElement("div");
  grid.className = "inv-grid";
  grid.style.marginBottom = "18px";

  const slotItems = ACCESSORIES.filter(function (acc) {
    return acc.slot === slot && ownedAcc.has(acc.id);
  });
  if (slot === "posternick") {
    for (const id of ownedAcc) {
      if (seasonTitleInfo(id) !== null) {
        slotItems.push(accessoryById(id));
      }
    }
  }
  const sortedItems = sortByRarity(slotItems, function (a) { return accessoryRarity(a.id); });
  const hasEquipped = slotItems.some(function (acc) {
    return equipped.indexOf(acc.id) !== -1;
  });

  grid.appendChild(invItem(noneIcon(), t("posterNone"), !hasEquipped, false, async function () {
    if (!hasEquipped) {
      return;
    }
    const next = equippedAccList().filter(function (id) {
      const other = accessoryById(id);
      return other === null || other.slot !== slot;
    });
    audio.equip();
    await equipAccessories(next);
    renderPosterEditor();
    renderPosterPreview();
    renderProfileChip();
    patchBoardRow();
  }));

  for (const acc of sortedItems) {
    const isOwned = ownedAcc.has(acc.id);
    const isNew = isOwned && isItemUnseen("accessory", acc.id);
    const isEquipped = equipped.indexOf(acc.id) !== -1;
    grid.appendChild(invItem(accessoryIconDataUrl(acc.id, 88), accName(acc), isEquipped, !isOwned, async function () {
      if (isEquipped) {
        return;
      }
      const next = equippedAccList().filter(function (id) {
        const other = accessoryById(id);
        return other === null || other.slot !== acc.slot;
      });
      next.push(acc.id);
      audio.equip();
      await equipAccessories(next);
      renderPosterEditor();
      renderPosterPreview();
      renderProfileChip();
      patchBoardRow();
    }, accessoryRarity(acc.id), isNew));
  }
  return grid;
}

function renderPosterEditor() {
  const container = el("poster-items");
  container.innerHTML = "";
  const cat = POSTER_CATS.find(function (c) { return c.slot === posterCat; }) || POSTER_CATS[0];
  const slots = cat.group || [cat.slot];
  let totalOwned = 0;
  const grids = [];
  const ownedAcc = ownedAccessories();
  for (const slot of slots) {
    const slotItems = ACCESSORIES.filter(function (acc) {
      return acc.slot === slot && ownedAcc.has(acc.id);
    });
    totalOwned += slotItems.length;
    grids.push({count: slotItems.length, el: posterSlotGrid(slot)});
  }
  if (totalOwned === 0) {
    container.appendChild(grids[0].el);
  } else {
    for (const g of grids) {
      if (g.count > 0) {
        container.appendChild(g.el);
      }
    }
  }
}

el("btn-poster-edit").addEventListener("click", function () {
  renderPosterTabs();
  renderPosterEditor();
  el("screen-profile").classList.add("editing");
  el("poster-editor").classList.remove("hidden");
  markPosterCatSeen();
});

el("btn-poster-back").addEventListener("click", function () {
  el("screen-profile").classList.remove("editing");
  el("poster-editor").classList.add("hidden");
});

const caseItems = [];
for (const skin of SKINS) {
  if (skin.id !== "drifter" && !skin.event) {
    caseItems.push({ kind: "skin", ref: skin.id, nameKey: skin.nameKey, icon: portraitDataUrl(skin.id, 64), rarity: skinRarity(skin) });
  }
}
for (const weapon of WEAPONS) {
  if (weapon.id !== "iron") {
    caseItems.push({ kind: "weapon", ref: weapon.id, nameKey: weapon.nameKey, icon: weaponIconDataUrl(weapon.id, 64), rarity: rarityOf(weapon.price) });
  }
}
for (const acc of ACCESSORIES) {
  caseItems.push({ kind: "accessory", ref: acc.id, nameKey: acc.nameKey, icon: accessoryIconDataUrl(acc.id, 64), rarity: accessoryRarity(acc.id) });
}

function caseItemFor(kind, ref) {
  for (const item of caseItems) {
    if (item.kind === kind && item.ref === ref) {
      return item;
    }
  }
  return caseItems[0];
}

function caseCard(item) {
  const card = document.createElement("div");
  card.className = "case-card rarity-" + item.rarity;
  const img = document.createElement("img");
  img.src = item.icon;
  const label = document.createElement("div");
  label.className = "case-name";
  label.textContent = t(item.nameKey);
  card.appendChild(img);
  card.appendChild(label);
  return card;
}

function renderCaseIdle() {
  const strip = el("case-strip");
  strip.style.transition = "none";
  strip.style.transform = "translateX(0)";
  strip.innerHTML = "";
  for (let i = 0; i < 14; i++) {
    strip.appendChild(caseCard(caseItems[Math.floor(Math.random() * caseItems.length)]));
  }
}

function runCaseAnimation(result, onDone) {
  const strip = el("case-strip");
  const windowNode = el("case-window");
  strip.style.transition = "none";
  strip.style.transform = "translateX(0)";
  strip.innerHTML = "";
  const winnerIndex = 42;
  const total = 50;
  for (let i = 0; i < total; i++) {
    const item = i === winnerIndex
      ? caseItemFor(result.kind, result.ref)
      : caseItems[Math.floor(Math.random() * caseItems.length)];
    const card = caseCard(item);
    if (i === winnerIndex) {
      card.classList.add("case-winner");
    }
    strip.appendChild(card);
  }
  const cardW = 104;
  const jitter = (Math.random() - 0.5) * 46;
  const target = winnerIndex * cardW + cardW / 2 - windowNode.clientWidth / 2 + jitter;
  void strip.offsetWidth;
  strip.style.transition = "transform 4.4s cubic-bezier(0.1, 0.6, 0.06, 1)";
  strip.style.transform = "translateX(" + (-target) + "px)";
  const center = windowNode.clientWidth / 2;
  let lastIndex = -1;
  let rafId = null;
  const startAt = performance.now();
  function tickLoop(now) {
    if (now - startAt > 4500) {
      return;
    }
    const style = getComputedStyle(strip).transform;
    let tx = 0;
    if (style && style !== "none") {
      const parts = style.match(/matrix\(([^)]+)\)/);
      if (parts) {
        tx = parseFloat(parts[1].split(",")[4]);
      }
    }
    const index = Math.floor((-tx + center) / cardW);
    if (lastIndex === -1) {
      lastIndex = index;
    } else if (index !== lastIndex) {
      lastIndex = index;
      audio.uiClick();
    }
    rafId = requestAnimationFrame(tickLoop);
  }
  rafId = requestAnimationFrame(tickLoop);
  setTimeout(function () {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    onDone();
  }, 4650);
}

let homeAdTimer = null;
let adCaseTimer = null;

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}

async function refreshHomeAd() {
  if (!isCrazyGames() || getProfile() === null) {
    return;
  }
  const state = await adState();
  if (state === null) {
    return;
  }
  const btn = el("btn-home-ad");
  const go = el("home-ad-go");
  el("home-ad-amount").textContent = "+20 🪙";
  if (homeAdTimer !== null) {
    clearInterval(homeAdTimer);
    homeAdTimer = null;
  }
  if (state.daily_done) {
    btn.disabled = true;
    const claimedAt = Number(localStorage.getItem("hn-ad-daily-at")) || Date.now();
    const resetAt = claimedAt + 86400000;
    const tick = function () {
      const left = Math.max(0, Math.floor((resetAt - Date.now()) / 1000));
      if (left === 0) {
        clearInterval(homeAdTimer);
        homeAdTimer = null;
        refreshHomeAd();
        return;
      }
      go.textContent = "⏳ " + pad2(Math.floor(left / 3600)) + ":" + pad2(Math.floor(left / 60) % 60) + ":" + pad2(left % 60);
    };
    tick();
    homeAdTimer = setInterval(tick, 1000);
  } else {
    btn.disabled = false;
    go.textContent = "📺 " + t("adWatch");
  }
}

function adItemCell(item) {
  const info = caseItemFor(item.kind, item.ref);
  const cell = document.createElement("div");
  cell.className = "ad-item rarity-" + info.rarity;
  const img = document.createElement("img");
  img.src = info.icon;
  const label = document.createElement("div");
  label.className = "ad-count";
  let go = null;
  if (item.owned) {
    label.textContent = "✔";
    cell.classList.add("owned");
  } else {
    label.textContent = item.watched + "/" + item.needed;
    go = document.createElement("div");
    go.className = "ad-go";
    go.textContent = "📺 " + t("adWatch");
    cell.onclick = function () {
      if (cell.classList.contains("busy")) {
        return;
      }
      cell.classList.add("busy");
      requestRewardedAd({
        onStart: adMuteOn,
        onFinish: function () {
          adMuteOff();
          adWatchItem(item.kind, item.ref).then(function (res) {
            cell.classList.remove("busy");
            if (res === null) {
              return;
            }
            item.watched = res.watched;
            if (res.unlocked) {
              item.owned = true;
              audio.wheelWin();
              const node = el("wheel-result");
              node.textContent = t("wheelNew", { item: t(info.nameKey) });
              node.classList.remove("hidden");
            } else {
              audio.uiClick();
            }
            renderAdItems();
            updateNotifs();
          });
        },
        onError: function () {
          adMuteOff();
          cell.classList.remove("busy");
          showToast(t("shopAdFail"), null, null, 4000);
        }
      });
    };
  }
  cell.appendChild(img);
  cell.appendChild(label);
  if (go !== null) {
    cell.appendChild(go);
  }
  return cell;
}

let adShopData = null;

function renderAdItems() {
  const row = el("ad-items");
  row.innerHTML = "";
  if (adShopData === null) {
    return;
  }
  for (const item of adShopData.items) {
    row.appendChild(adItemCell(item));
  }
  const btn = el("btn-ad-case");
  if (adCaseTimer !== null) {
    clearInterval(adCaseTimer);
    adCaseTimer = null;
  }
  if (adShopData.case_left <= 0) {
    btn.disabled = true;
    const claimedAt = Number(localStorage.getItem("hn-ad-case-at")) || Date.now();
    const resetAt = claimedAt + 86400000;
    const tick = function () {
      const left = Math.max(0, Math.floor((resetAt - Date.now()) / 1000));
      if (left === 0) {
        clearInterval(adCaseTimer);
        adCaseTimer = null;
        refreshAdShop();
        return;
      }
      btn.textContent = "⌛ " + pad2(Math.floor(left / 3600)) + ":" + pad2(Math.floor(left / 60) % 60) + ":" + pad2(left % 60);
    };
    tick();
    adCaseTimer = setInterval(tick, 1000);
  } else {
    btn.textContent = "📺 " + t("adWatch");
    btn.disabled = spinning;
  }
}

function applyAdShop() {
  const block = el("ad-shop");
  const caseBtn = el("btn-ad-case");
  const ok = isCrazyGames() && adShopData !== null;
  block.classList.toggle("hidden", !ok);
  caseBtn.classList.toggle("hidden", !ok);
  if (ok) {
    renderAdItems();
  }
}

async function refreshAdShop() {
  if (!isCrazyGames()) {
    applyAdShop();
    return;
  }
  const state = await adState();
  if (state !== null) {
    adShopData = state;
  }
  applyAdShop();
  updateNotifs();
}

el("btn-ad-case").addEventListener("click", function () {
  if (spinning || adShopData === null || adShopData.case_left <= 0) {
    return;
  }
  requestRewardedAd({
    onStart: adMuteOn,
    onFinish: function () {
      adMuteOff();
      adCase().then(function (result) {
        if (!result.ok) {
          showToast(t("shopAdFail"), null, null, 4000);
          return;
        }
        adShopData.case_left = Number(result.left);
        if (result.left <= 0) {
          localStorage.setItem("hn-ad-case-at", String(Date.now()));
        }
        spinning = true;
        lockScreen();
        el("btn-spin").disabled = true;
        el("btn-ad-case").disabled = true;
        el("wheel-result").classList.add("hidden");
        audio.whoosh();
        runCaseAnimation(result, function () {
          spinning = false;
          unlockScreen();
          el("btn-spin").disabled = false;
          refreshCoins();
          renderAdItems();
          updateNotifs();
          const item = caseItemFor(result.kind, result.ref);
          const resultNode = el("wheel-result");
          if (result.duplicate) {
            audio.coin();
            resultNode.textContent = t("wheelDup", { item: t(item.nameKey), n: result.refund });
          } else {
            audio.wheelWin();
            resultNode.textContent = t("wheelNew", { item: t(item.nameKey) });
          }
          resultNode.classList.remove("hidden");
        });
      });
    },
    onError: function () {
      adMuteOff();
      showToast(t("shopAdFail"), null, null, 4000);
    }
  });
});

function refreshSpinButton() {
  const n = freeDraws();
  if (n > 0) {
    el("btn-spin").textContent = t("wheelFree", { n: n });
  } else {
    el("btn-spin").textContent = t("wheelSpin");
  }
}

function openShop() {
  bootAudio();
  accountReady().then(function (profile) {
    if (profile === null) {
      alert(t("connectError"));
      return;
    }
    goStation("store", function () {
      refreshCoins();
      el("wheel-result").classList.add("hidden");
      renderCaseIdle();
      applyAdShop();
      refreshAdShop();
      refreshSpinButton();
      ui.showScreen("screen-shop");
    });
  });
}

el("btn-shop").addEventListener("click", openShop);

el("btn-shop-back").addEventListener("click", function () {
  markShopSeen();
  updateNotifs();
  leaveStation();
});

el("btn-spin").addEventListener("click", async function () {
  if (spinning) {
    return;
  }
  const resultNode = el("wheel-result");
  const result = await spinWheel();
  if (!result.ok) {
    if (result.reason === "poor") {
      resultNode.textContent = t("wheelPoor");
    } else {
      resultNode.textContent = t("accountError");
    }
    resultNode.classList.remove("hidden");
    return;
  }
  spinning = true;
  lockScreen();
  el("btn-spin").disabled = true;
  resultNode.classList.add("hidden");
  audio.whoosh();
  runCaseAnimation(result, function () {
    spinning = false;
    unlockScreen();
    el("btn-spin").disabled = false;
    refreshCoins();
    refreshSpinButton();
    updateNotifs();
    const item = caseItemFor(result.kind, result.ref);
    if (result.duplicate) {
      audio.coin();
      resultNode.textContent = t("wheelDup", { item: t(item.nameKey), n: result.refund });
    } else {
      audio.wheelWin();
      resultNode.textContent = t("wheelNew", { item: t(item.nameKey) });
    }
    resultNode.classList.remove("hidden");
  });
});

el("btn-home-ad").addEventListener("click", function () {
  bootAudio();
  accountReady().then(function (profile) {
    if (profile === null) {
      showToast(t("shopAdFail"), null, null, 4000);
      return;
    }
    el("btn-home-ad").disabled = true;
    requestRewardedAd({
      onStart: adMuteOn,
      onFinish: function () {
        adMuteOff();
        el("btn-home-ad").disabled = false;
        claimAdReward().then(function () {
          localStorage.setItem("hn-ad-daily-at", String(Date.now()));
          renderProfileChip();
          refreshHomeAd();
        });
      },
      onError: function () {
        adMuteOff();
        el("btn-home-ad").disabled = false;
        showToast(t("shopAdFail"), null, null, 4000);
      }
    });
  });
});

async function initSocial() {
  const profile = getProfile();
  if (socialReady || profile === null) {
    return;
  }
  socialReady = true;
  goOnline(profile.id, function () {
    renderFriends();
    updatePlayersOnline();
  }, refreshFriends, function (banned, reason) {
    const p = getProfile();
    if (p !== null) {
      p.banned = banned;
      p.ban_reason = reason;
    }
    checkBanned();
    if (banned) {
      try {
        if (activeDuel !== null) {
          activeDuel.exit();
        } else if (activeMinigame !== null) {
          activeMinigame.exit();
        }
      } catch (e) {}
    }
  });
  listenChallenges(profile.id, onChallenge, onChallengeReply, refreshFriends);
  listenEvents(refreshEventBanner);
  refreshFriends();
  await refreshChallenges();
  refreshEventBanner();
  seasonData = await seasonInfo();
  renderProfileChip();
  refreshHomeAd();
  refreshAdShop();
  fetchBoard();
  updatePlayersOnline();
  setInterval(refreshFriends, 30000);
}

async function refreshFriends() {
  if (getProfile() === null) {
    return;
  }
  if (isRealCrazyGames()) {
    el("friend-add").classList.add("hidden");
    const cg = await cgFriendsResolved();
    if (cg !== null) {
      friendsCache = cg;
    }
  } else {
    el("friend-add").classList.remove("hidden");
    const rows = await listFriends();
    if (rows !== null) {
      friendsCache = rows;
    }
  }
  renderFriends();
  updateNotifs();
}

function friendAvatar(entry) {
  const img = document.createElement("img");
  img.src = portraitDataUrl(entry.skin || "drifter", 60, entry.accessories || [], entry.weapon || "iron");
  if (entry.cg && entry.avatar) {
    const cgImg = new Image();
    cgImg.onload = function () {
      img.src = entry.avatar;
    };
    cgImg.src = entry.avatar;
  }
  return img;
}

function friendButton(label, ghost, onClick) {
  const btn = document.createElement("button");
  btn.className = "friend-btn";
  if (ghost) {
    btn.classList.add("ghost");
  }
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
}

function setFriendsMsg(text) {
  const node = el("friends-msg");
  if (text === "") {
    node.classList.add("hidden");
  } else {
    node.textContent = text;
    node.classList.remove("hidden");
  }
}

function setAddMsg(text, ok) {
  const node = el("friend-addmsg");
  if (addMsgTimer !== null) {
    clearTimeout(addMsgTimer);
    addMsgTimer = null;
  }
  if (text === "") {
    node.classList.add("hidden");
    return;
  }
  node.textContent = text;
  node.classList.remove("hidden");
  node.classList.toggle("ok-text", ok === true);
  addMsgTimer = setTimeout(function () {
    node.classList.add("hidden");
    addMsgTimer = null;
  }, 4000);
}

function renderFriends() {
  const list = el("friends-list");
  list.innerHTML = "";
  if (friendsCache.length === 0) {
    setFriendsMsg(t("friendsNone"));
    return;
  }
  setFriendsMsg("");
  for (const entry of friendsCache) {
    const row = document.createElement("div");
    row.className = "friend-row friend-clickable";
    const main = document.createElement("div");
    main.className = "friend-main";
    const name = document.createElement("div");
    name.className = "friend-name";
    name.textContent = entry.pseudo;
    const sub = document.createElement("div");
    sub.className = "friend-sub";
    main.appendChild(name);
    main.appendChild(sub);
    row.addEventListener("click", function (e) {
      if (e.target.closest("button")) {
        return;
      }
      openFriendProfile(entry);
    });
    row.appendChild(friendAvatar(entry));
    row.appendChild(main);
    if (entry.cg) {
      const online = entry.profileId !== null && isOnline(entry.profileId);
      const ready = entry.profileId !== null && online && onlineState(entry.profileId) !== "game" && onlineState(entry.profileId) !== "matchmaking";
      const dot = document.createElement("span");
      dot.className = "dot";
      if (online) {
        dot.classList.add("on");
      }
      row.appendChild(dot);
      if (ready) {
        row.appendChild(friendButton(t("friendsChallenge"), false, function () {
          challengeOnline(entry.profileId, entry.pseudo);
        }));
      } else if (online) {
        const duelBtn = friendButton(t("friendsChallenge"), false, function () {});
        duelBtn.disabled = true;
        row.appendChild(duelBtn);
      } else {
        row.appendChild(friendButton(t("friendsInvite"), false, function () {
          inviteAnyFriend();
        }));
      }
    } else if (entry.status === "pending") {
      sub.textContent = t("friendsPending");
      if (entry.incoming) {
        if (friendReqIsNew(entry)) {
          main.classList.add("has-notif");
        }
        row.appendChild(friendButton("✓", false, async function () {
          await respondFriendRequest(entry.fid, true);
          notifyFriendsChange(entry.id);
          refreshFriends();
        }));
        row.appendChild(friendButton("✕", true, async function () {
          await respondFriendRequest(entry.fid, false);
          notifyFriendsChange(entry.id);
          refreshFriends();
        }));
      } else {
        row.appendChild(friendButton("✕", true, async function () {
          await removeFriend(entry.fid);
          notifyFriendsChange(entry.id);
          refreshFriends();
        }));
      }
    } else {
      const online = isOnline(entry.id);
      const ready = online && onlineState(entry.id) !== "game" && onlineState(entry.id) !== "matchmaking";
      const dot = document.createElement("span");
      dot.className = "dot";
      if (online) {
        dot.classList.add("on");
      }
      row.appendChild(dot);
      const duelBtn = friendButton(t("friendsChallenge"), false, function () {
        challengeOnline(entry.id, entry.pseudo);
      });
      duelBtn.disabled = !ready;
      row.appendChild(duelBtn);
      const btnDel = friendButton("✕", true, function() {});
      btnDel.onclick = function () {
        showToast(t("friendDeleteConfirm"), function () {
          removeFriend(entry.fid).then(function () {
            notifyFriendsChange(entry.id);
            refreshFriends();
          });
        }, null, 8000);
      };
      row.appendChild(btnDel);
    }
    list.appendChild(row);
  }
}

el("btn-friend-add").addEventListener("click", async function () {
  bootAudio();
  const code = el("friend-input").value.trim().toUpperCase();
  if (code.length < 1) {
    return;
  }
  const profile = await accountReady();
  if (profile === null) {
    setAddMsg(t("accountError"), false);
    return;
  }
  const result = await sendFriendRequest(code);
  if (result.ok) {
    el("friend-input").value = "";
    setAddMsg(t("friendsSent"), true);
    audio.friendPing();
    if (result.target) {
      notifyFriendsChange(result.target);
    }
    refreshFriends();
  } else if (result.reason === "notfound") {
    setAddMsg(t("friendsNotFound"), false);
  } else if (result.reason === "self") {
    setAddMsg(t("friendsSelf"), false);
  } else if (result.reason === "already") {
    setAddMsg(t("friendsAlready"), false);
  } else {
    setAddMsg(t("accountError"), false);
  }
});

el("btn-friends").addEventListener("click", function () {
  bootAudio();
  const willOpen = !el("friends-bar").classList.contains("open");
  el("friends-bar").classList.toggle("open");
  if (willOpen) {
    renderFriends();
    markFriendReqsSeen();
    updateNotifs();
  }
});

el("friends-close").addEventListener("click", function () {
  audio.uiClick();
  el("friends-bar").classList.remove("open");
});

el("btn-lock-quit").addEventListener("click", function (e) {
  e.stopPropagation();
  if (activeDuel !== null) {
    activeDuel.exit();
  } else if (activeMinigame !== null) {
    activeMinigame.exit();
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") {
    return;
  }
  if (window.levelUpBusy) {
    return;
  }
  if (activeDuel !== null || activeMinigame !== null || storyMode.isActive()) {
    return;
  }
  if (town.isBusy()) {
    return;
  }
  if (spinning) {
    return;
  }
  if (el("friends-bar").classList.contains("open")) {
    el("friends-bar").classList.remove("open");
    return;
  }
  if (el("screen-profile").classList.contains("editing") && !el("screen-profile").classList.contains("hidden")) {
    el("btn-poster-back").click();
    return;
  }
  const backMap = [
    ["screen-shop", "btn-shop-back"],
    ["screen-inventory", "btn-inv-back"],
    ["screen-profile", "btn-profile-back"],
    ["screen-pass", "btn-pass-back"],
    ["screen-help", "btn-help-back"],
    ["screen-story", "btn-story-back"],
    ["screen-patch", "btn-patch-back"]
  ];
  for (const pair of backMap) {
    const screen = el(pair[0]);
    if (screen !== null && !screen.classList.contains("hidden")) {
      el(pair[1]).click();
      return;
    }
  }
  if (!el("station-bar").classList.contains("hidden")) {
    el("btn-station-back").click();
  }
});

function challengeOnline(profileId, oppName) {
  if (isOnline(profileId) && (onlineState(profileId) === "game" || onlineState(profileId) === "matchmaking")) {
    showToast(t("challengeBusy"), null, null, 4000);
    return;
  }
  const profile = getProfile();
  if (profile === null || activeDuel !== null || activeMinigame !== null || friendRoom !== null) {
    return;
  }
  const code = makeFriendCode();
  pendingChallengeCode = code;
  setOnlineState("matchmaking");
  sendChallenge(profileId, { code: code, from: profile.pseudo, senderId: profile.id });
  openFriendRoom(code, true, true, oppName);
}

function inviteAnyFriend() {
  if (activeDuel !== null) {
    return;
  }
  setOnlineState("matchmaking");
  openFriendRoom(makeFriendCode(), true);
}

function onChallenge(payload) {
  const code = payload.code;
  const decline = function () {
    sendChallengeReply(payload.senderId, { accepted: false, code: code });
  };
  if (activeDuel !== null || activeMinigame !== null || friendRoom !== null || matchmaker !== null || searchInterval !== null) {
    decline();
    return;
  }
  const from = String(payload.from).slice(0, 16);
  bootAudio();
  audio.friendPing();
  showToast(t("challengeFrom", { name: from }), function () {
    accountReady().then(function () {
      setOnlineState("matchmaking");
      openFriendRoom(code, false);
      sendChallengeReply(payload.senderId, { accepted: true, code: code });
    });
  }, decline, 8000, decline);
}

function onChallengeReply(payload) {
  const code = String(payload.code);
  if (payload.accepted === false) {
    if (activeDuel !== null || friendRoom === null || code !== friendCode) {
      return;
    }
    stopSearch();
    setOnlineState("menu");
    pendingChallengeCode = null;
    hideInviteButton();
    el("friend-block").classList.add("hidden");
    el("search-timer").classList.add("hidden");
    el("search-found-name").classList.add("hidden");
    el("btn-search-cancel").classList.add("hidden");
    returnToMenu();
    showToast(t("challengeDeclined"), null, null, 4000);
  } else if (payload.accepted === true && code === pendingChallengeCode) {
    pendingChallengeCode = null;
  }
}

function lockScreen() {
  let lock = el("ui-lock");
  if (lock === null) {
    lock = document.createElement("div");
    lock.id = "ui-lock";
    document.body.appendChild(lock);
  }
  lock.classList.remove("hidden");
}

function unlockScreen() {
  const lock = el("ui-lock");
  if (lock !== null) {
    lock.classList.add("hidden");
  }
}

function resetDuelScene() {
  cowboy.reset();
  cowboy.setSkin(skinById("drifter").colors);
  cowboy.setOutfit(null);
  cowboy.setAccessories([]);
  cowboy.setWeapon(weaponById("iron").colors);
  viewmodel.holster();
  arena.applyModifier({ id: "noon", sway: 0 }, 19);
  arena.playerRig.position.set(0, 1.6, 7);
  arena.camera.position.set(0, 0, 0);
  arena.camera.rotation.set(0, 0, 0);
  arena.camera.fov = 70;
  arena.camera.updateProjectionMatrix();
  ui.hudVisible(false);
}

function backToMenu(skipAd) {
  activeDuel = null;
  setOnlineState("menu");
  resetDuelScene();
  cowboy.group.visible = false;
  town.setActive(true);
  town.warpTo("home");
  music.setMode("menu");
  hideStationBar();
  refreshTownTexts();
  ui.showScreen("screen-title");
  renderProfileChip();
  refreshChallenges();
  refreshEventBanner();
  if (skipAd !== true) {
    requestMidgameAd({ onStart: adMuteOn, onDone: adMuteOff });
  }
}

function duelProfile() {
  const profile = getProfile();
  if (profile === null) {
    return { id: null, pseudo: localPseudo(), skin: "drifter", acc: [], weapon: "iron", prime: 100 };
  }
  return { id: profile.id, pseudo: profile.pseudo, skin: profile.skin, acc: profile.accessories, weapon: profile.weapon, prime: profile.prime };
}

function applyMyWeapon() {
  const profile = getProfile();
  let weaponId = "iron";
  if (profile !== null) {
    weaponId = profile.weapon;
  }
  viewmodel.setWeapon(weaponById(weaponId).colors);
}

function handleResult(ranked) {
  return function (won, oppPrime, stats, oppId) {
    if (getProfile() === null || !netAvailable()) {
      return;
    }
    if (ranked) {
      recordStats(stats, won);
    }
    const before = getProfile();
    let prevXp = null;
    if (before !== null && Number.isFinite(Number(before.xp))) {
      prevXp = Number(before.xp);
    }
    reportResult(won, ranked, oppPrime, oppId).then(function (result) {
      if (result === null) {
        return;
      }
      if (won) {
        submitCgScore(result.prime);
      }
      renderProfileChip();
      fetchBoard();
      const reward = el("matchend-reward");
      if (reward === null) {
        return;
      }
      let html = "";
      if (ranked) {
        let deltaStr = result.prime_delta + " $";
        if (result.prime_delta >= 0) {
          deltaStr = "+" + result.prime_delta + " $";
        }
        html += '<div class="me-rank">' + deltaStr + "</div>";
      }
      if (result.coins_delta > 0) {
        html += "<div>+" + result.coins_delta + " 🪙</div>";
      }
      if (prevXp !== null && Number.isFinite(Number(result.xp)) && Number(result.xp) > prevXp) {
        html += "<div>+" + (Number(result.xp) - prevXp) + " XP</div>";
      }
      reward.innerHTML = html;
      reward.classList.remove("hidden");
    });
  };
}

function startCombatMusic() {
  bootAudio();
  music.start();
  music.setMode("combat");
}

function prepGalleryScene() {
  town.setActive(false);
  hideStationBar();
  playerBody.group.visible = false;
  cowboy.group.visible = false;
  arena.camera.fov = 70;
  arena.camera.updateProjectionMatrix();
}

function startGallery(mode, net) {
  prepGalleryScene();
  setOnlineState("game");
  applyMyWeapon();
  activeMinigame = new Gallery({
    arena: arena,
    ui: ui,
    audio: audio,
    viewmodel: viewmodel,
    isTouch: isTouch,
    mode: mode,
    net: net,
    seed: net ? net.seed : randomSeed(),
    onExit: exitGallery
  });
  ui.showScreen(null);
  activeMinigame.start();
  bootAudio();
  music.start();
  music.setMode("saloon");
  refreshCoins();
}

function exitGallery() {
  activeMinigame = null;
  backToMenu();
}

function startOldJedDuel() {
  if (activeDuel !== null) {
    return;
  }
  prepDuelScene();
  el("backdrop").classList.add("hidden");
  setOnlineState("game");
  const aiSkin = aiSkinFor(TRAINING_PERSONA.id);
  cowboy.setSkin(aiSkin.colors);
  cowboy.setOutfit(aiSkin.outfit || null);
  cowboy.setAccessories(aiSkin.acc);
  cowboy.setWeapon(weaponById(aiSkin.weapon).colors);
  applyMyWeapon();
  const ai = new AiOpponent(TRAINING_PERSONA, createRng(randomSeed()));
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
    onResult: null,
    onCombat: startCombatMusic,
    oppColors: aiSkin.colors,
    oppOutfit: aiSkin.outfit || null,
    oppAcc: aiSkin.acc,
    playerBody: playerBody,
    onExit: backToMenu
  });
  activeDuel.start();
  refreshCoins();
}

function startNetDuel(room, ranked, friendly) {
  prepDuelScene();
  el("backdrop").classList.add("hidden");
  setOnlineState("game");
  applyMyWeapon();
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
    onCombat: startCombatMusic,
    prevTopId: seasonData !== null ? seasonData.prev_top : null,
    playerBody: playerBody,
    onExit: backToMenu
  });
  activeDuel.start();
  refreshCoins();
}

async function generateRankedBot() {
  const profile = getProfile();
  const rng = createRng(randomSeed());
  let idStr;
  let pseudo;
  for (let i = 0; i < 10; i++) {
    idStr = String(10000 + Math.floor(rng() * 90000));
    pseudo = "User" + idStr;
    if (profile !== null && profile.pseudo === pseudo) continue;
    
    if (netAvailable()) {
      try {
        const { count } = await getClient().from("profiles").select("id", { count: "exact", head: true }).eq("pseudo", pseudo);
        if (count === 0) break;
      } catch (err) {
        break;
      }
    } else {
      break;
    }
  }
  const bounty = 100 + Math.floor(rng() * 100);

  const validSkins = SKINS.filter(s => {
    const r = skinRarity(s);
    return r === "common" || r === "rare";
  });
  const skin = validSkins[Math.floor(rng() * validSkins.length)] || SKINS[0];

  const validWeapons = WEAPONS.filter(w => {
    const r = rarityOf(w.price);
    return r === "common" || r === "rare";
  });
  const weapon = validWeapons[Math.floor(rng() * validWeapons.length)] || WEAPONS[0];

  const validAcc = ACCESSORIES.filter(a => {
    const r = accessoryRarity(a.id);
    return r === "common" || r === "rare";
  });
  const accCount = rng() > 0.5 ? 1 : 2;
  const accList = [];
  for (let i = 0; i < accCount; i++) {
    const a = validAcc[Math.floor(rng() * validAcc.length)];
    if (accList.indexOf(a.id) === -1) {
      accList.push(a.id);
    }
  }

  return {
    id: "bot_ranked",
    name: pseudo,
    bounty: bounty,
    skinId: skin.id,
    colors: skin.colors,
    acc: accList,
    weapon: weapon.id,
    health: 2,
    reaction: [250, 350],
    aim: [300, 450],
    accHead: 0.25,
    accBody: 0.6,
    misfireChance: 0.05,
    dodgeChance: 0.15,
    patience: 0
  };
}

function startRankedBotDuel() {
  stopSearch();
  const wasTraining = trainingActive;
  if (wasTraining) {
    endTrainingForMatch();
  }
  el("btn-search-cancel").classList.add("hidden");
  el("training-block").classList.add("hidden");
  el("search-title").textContent = t("opponentFound");
  el("search-found-name").classList.add("hidden");
  if (wasTraining) {
    el("search-timer").classList.add("hidden");
    ui.showScreen("screen-search");
  }

  searchTransitionTimer = setTimeout(async function () {
    searchTransitionTimer = null;
    prepDuelScene();
    el("backdrop").classList.add("hidden");
    setOnlineState("game");
    applyMyWeapon();
    let onResult = handleResult(true);

    const botPersona = await generateRankedBot();
    const ai = new AiOpponent(botPersona, createRng(randomSeed()));

    cowboy.setSkin(botPersona.colors);
    cowboy.setOutfit(skinById(botPersona.skinId).outfit || null);
    cowboy.setAccessories(botPersona.acc);
    cowboy.setWeapon(weaponById(botPersona.weapon).colors);
    
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
      ranked: true,
      profile: duelProfile(),
      onResult: onResult,
      onCombat: startCombatMusic,
      prevTopId: seasonData !== null ? seasonData.prev_top : null,
      playerBody: playerBody,
      onExit: backToMenu
    });
    
    activeDuel.oppPrime = botPersona.bounty;
    activeDuel.oppSkin = botPersona.skinId;
    activeDuel.oppAcc = botPersona.acc;
    
    activeDuel.start();
    refreshCoins();
  }, 2000);
}

function stopSearch(keepFriendRoom = false) {
  if (roomWaitTimer !== null) {
    clearTimeout(roomWaitTimer);
    roomWaitTimer = null;
  }
  if (searchInterval !== null) {
    clearInterval(searchInterval);
    searchInterval = null;
  }
  if (searchTransitionTimer !== null) {
    clearTimeout(searchTransitionTimer);
    searchTransitionTimer = null;
  }
  if (matchmaker !== null) {
    matchmaker.cancel();
    matchmaker = null;
  }
  if (friendRoom !== null) {
    if (!keepFriendRoom) {
      friendRoom.cancel();
    }
    friendRoom = null;
    friendCode = null;
    hideInviteButton();
  }
  if (activeDuel === null) {
    setOnlineState("menu");
  }
}

function startSearch() {
  setOnlineState("matchmaking");
  el("search-title").textContent = t("searchTitle");
  el("search-timer").classList.remove("hidden");
  el("friend-block").classList.add("hidden");
  el("training-block").classList.remove("hidden");
  el("btn-search-cancel").classList.remove("hidden");
  el("search-found-name").classList.add("hidden");
  ui.showScreen("screen-search");
  ui.searchTick(0);
  let seconds = 0;
  const botMatchSeconds = 15 + Math.floor(Math.random() * 3);
  let myPid = null;
  const searchProfile = getProfile();
  if (searchProfile !== null) {
    myPid = searchProfile.id;
  }
  matchmaker = createMatchmaker(myPid);
  searchInterval = setInterval(function () {
    seconds += 1;
    ui.searchTick(seconds);
    updateTrainingBadge(seconds);
    if (seconds >= botMatchSeconds) {
      startRankedBotDuel();
    }
  }, 1000);
  matchmaker.search({
    onMatched: function (room) {
      stopSearch();
      const wasTraining = trainingActive;
      if (wasTraining) {
        endTrainingForMatch();
      }
      el("btn-search-cancel").classList.add("hidden");
      el("training-block").classList.add("hidden");
      el("search-title").textContent = t("opponentFound");
      el("search-found-name").classList.add("hidden");
      if (wasTraining) {
        el("search-timer").classList.add("hidden");
        ui.showScreen("screen-search");
      }
      searchTransitionTimer = setTimeout(function () {
        searchTransitionTimer = null;
        startNetDuel(room, true, false);
      }, 2000);
    },
    onPairFailed: function () {},
    onError: function () {
      const wasTraining = trainingActive;
      stopSearch();
      el("training-status").classList.add("hidden");
      if (!wasTraining) {
        leaveStation();
        alert(t("connectError"));
      }
    }
  });
}

function updateTrainingBadge(seconds) {
  if (!trainingActive) {
    return;
  }
  el("training-status-text").textContent = t("searchTitle") + " " + seconds + " s";
}

function startTrainingDuel() {
  if (activeDuel !== null || matchmaker === null) {
    return;
  }
  trainingActive = true;
  prepDuelScene();
  el("backdrop").classList.add("hidden");
  const aiSkin = aiSkinFor(TRAINING_PERSONA.id);
  cowboy.setSkin(aiSkin.colors);
  cowboy.setOutfit(aiSkin.outfit || null);
  cowboy.setAccessories(aiSkin.acc);
  cowboy.setWeapon(weaponById(aiSkin.weapon).colors);
  applyMyWeapon();
  const ai = new AiOpponent(TRAINING_PERSONA, createRng(randomSeed()));
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
    onResult: null,
    onCombat: startCombatMusic,
    oppColors: aiSkin.colors,
    oppOutfit: aiSkin.outfit || null,
    oppAcc: aiSkin.acc,
    playerBody: playerBody,
    onExit: exitTraining
  });
  el("training-status-text").textContent = t("searchTitle");
  el("training-status").classList.remove("hidden");
  activeDuel.start();
  refreshCoins();
}

function endTrainingForMatch() {
  trainingActive = false;
  el("training-status").classList.add("hidden");
  const duel = activeDuel;
  activeDuel = null;
  if (duel !== null) {
    duel.dispose();
  }
  resetDuelScene();
  cowboy.group.visible = false;
  town.setActive(true);
  town.warpTo("road");
  playerBody.group.visible = false;
  music.setMode("menu");
}

function exitTraining() {
  trainingActive = false;
  el("training-status").classList.add("hidden");
  activeDuel = null;
  if (matchmaker !== null) {
    resetDuelScene();
    cowboy.group.visible = false;
    town.setActive(true);
    town.startRoadWalk();
    music.setMode("menu");
    el("search-title").textContent = t("searchTitle");
    el("search-timer").classList.remove("hidden");
    el("friend-block").classList.add("hidden");
    el("training-block").classList.remove("hidden");
    el("btn-search-cancel").classList.remove("hidden");
    el("search-found-name").classList.add("hidden");
    ui.showScreen("screen-search");
    refreshCoins();
  } else {
    backToMenu();
  }
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

function openFriendRoom(rawCode, hosting, isChallenge = false, oppName) {
  const code = String(rawCode).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
  if (code.length < 4) {
    ui.showScreen("screen-title");
    return;
  }
  setOnlineState("matchmaking");
  if (hosting) {
    el("search-title").textContent = isChallenge
      ? (oppName ? t("challengeSentTo", { name: oppName }) : t("challengeSent"))
      : t("friendWait");
    el("friend-block").classList.toggle("hidden", isChallenge);
    if (!isChallenge) {
      el("friend-code").textContent = code.toUpperCase();
      showInviteButton(code);
    }
  } else {
    el("search-title").textContent = t("friendJoining");
    el("friend-block").classList.add("hidden");
  }
  el("training-block").classList.add("hidden");
  el("search-timer").classList.add("hidden");
  el("btn-search-cancel").classList.remove("hidden");
  ui.showScreen("screen-search");
  friendCode = code;
  let roomPid = null;
  const roomProfile = getProfile();
  if (roomProfile !== null) {
    roomPid = roomProfile.id;
  }
  friendRoom = createPrivateRoom(code, {
    onMatched: function (room) {
      stopSearch(true);
      el("btn-search-cancel").classList.add("hidden");
      el("friend-block").classList.add("hidden");
      pendingChallengeCode = null;
      startNetDuel(room, false, true);
    },
    onError: function () {
      stopSearch();
      ui.showScreen("screen-title");
      alert(t("connectError"));
    }
  }, roomPid);
  if (roomWaitTimer !== null) {
    clearTimeout(roomWaitTimer);
    roomWaitTimer = null;
  }
  if (isChallenge || !hosting) {
    roomWaitTimer = setTimeout(function () {
      roomWaitTimer = null;
      if (friendRoom === null || activeDuel !== null) {
        return;
      }
      stopSearch();
      leaveStation();
      showToast(t("challengeNoReply"), null, null, 4000);
    }, hosting ? 20000 : 15000);
  }
}

el("btn-friend-copy").addEventListener("click", function () {
  audio.uiClick();
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

const storyMode = createStoryMode({
  arena: arena,
  ui: ui,
  audio: audio,
  music: music,
  town: town,
  playerBody: playerBody,
  cowboy: cowboy,
  youSpec: function () {
    const profile = duelProfile();
    return {
      colors: skinById(profile.skin).colors,
      outfit: skinById(profile.skin).outfit,
      acc: profile.acc,
      weapon: profile.weapon,
      name: profile.pseudo
    };
  },
  begin: function () {
    bootAudio();
    hideToast();
    ui.showScreen(null);
    hideStationBar();
    town.setActive(false);
    playerBody.group.visible = false;
    cowboy.group.visible = false;
    el("backdrop").classList.add("hidden");
    setOnlineState("game");
    ui.hudVisible(false);
    refreshCoins();
    music.start();
  },
  launchDuel: function (opts) {
    arena.interiors.hideAll();
    prepDuelScene();
    el("backdrop").classList.add("hidden");
    const aiSkin = aiSkinFor(opts.personaId);
    cowboy.setSkin(aiSkin.colors);
    cowboy.setOutfit(aiSkin.outfit || null);
    cowboy.setAccessories(aiSkin.acc);
    cowboy.setWeapon(weaponById(aiSkin.weapon).colors);
    applyMyWeapon();
    const ai = new AiOpponent(opts.persona, createRng(randomSeed()));
    const baseResult = handleResult(false);
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
      forceModifier: opts.modifier,
      forceDistance: opts.distance,
      oppPerks: opts.perks,
      comebackPerks: false,
      onResult: baseResult,
      onCombat: startCombatMusic,
      oppColors: aiSkin.colors,
      oppOutfit: aiSkin.outfit || null,
      oppAcc: aiSkin.acc,
      playerBody: playerBody,
      quickEnd: function (won) {
        const duel = activeDuel;
        activeDuel = null;
        if (duel !== null) {
          duel.dispose();
        }
        resetDuelScene();
        opts.onEnd(won);
      },
      onExit: function () {
        activeDuel = null;
        storyMode.abort();
      }
    });
    activeDuel.start();
    refreshCoins();
  },
  launchMinigame: function (opts) {
    arena.interiors.hideAll();
    prepGalleryScene();
    el("backdrop").classList.add("hidden");
    applyMyWeapon();
    activeMinigame = new Gallery({
      arena: arena,
      ui: ui,
      audio: audio,
      viewmodel: viewmodel,
      isTouch: isTouch,
      mode: opts.mode,
      net: null,
      seed: randomSeed(),
      quickEnd: function (won, reason) {
        const game = activeMinigame;
        activeMinigame = null;
        if (game !== null) {
          game.dispose();
        }
        opts.onEnd(won, reason);
      },
      onExit: function () {
        activeMinigame = null;
        storyMode.abort();
      }
    });
    activeMinigame.start();
    music.setMode("standoff");
  },
  exitToMenu: function () {
    arena.interiors.hideAll();
    arena.applyModifier({ id: "noon", sway: 0 }, 19);
    backToMenu();
  },
  onChapterDone: function (index, isLast, replayed) {
    arena.interiors.hideAll();
    arena.applyModifier({ id: "noon", sway: 0 }, 19);
    const xpPromise = storyXp(index);
    const finalePromise = isLast && !replayed ? storyReward() : Promise.resolve(null);
    backToMenu(true);
    requestMidgameAd({
      onStart: adMuteOn,
      onDone: function () {
        adMuteOff();
        xpPromise.then(function (res) {
          renderProfileChip();
          refreshCoins();
          if (replayed) {
            return;
          }
          let html = "";
          if (res !== null && res.reward_kind) {
            let img = "";
            let itemName = "";
            if (res.reward_kind === "accessory") {
              img = accessoryIconDataUrl(res.reward_ref, 96);
              itemName = t(accessoryById(res.reward_ref).nameKey);
            } else if (res.reward_kind === "weapon") {
              img = weaponIconDataUrl(res.reward_ref, 96);
              itemName = t(weaponById(res.reward_ref).nameKey);
            }
            if (img !== "") {
              html += '<img class="popup-badge" src="' + img + '" alt="" />';
            }
            if (res.duplicate) {
              html += "<p>" + t("stRewardDup", { item: itemName }) + "</p>";
            } else {
              html += "<p>" + t("stRewardItem", { item: itemName }) + "</p>";
            }
          }
          if (res !== null && res.xp_gained > 0) {
            html += '<div class="popup-prime">+' + res.xp_gained + " XP</div>";
          }
          showPopup(t("stChapterDone", { n: index + 1 }), html);
          if (isLast) {
            finalePromise.then(function (fin) {
              let fhtml = "<p>" + t("stFinaleBody") + "</p>";
              if (fin !== null) {
                fhtml += '<img class="popup-badge" src="' + portraitDataUrl("undertaker", 128) + '" alt="" />';
                if (fin.duplicate) {
                  fhtml += "<p>" + t("stFinaleDup") + "</p>";
                } else {
                  fhtml += "<p>" + t("stFinaleSkin") + "</p>";
                }
              }
              showPopup(t("stFinaleTitle"), fhtml);
              renderProfileChip();
              refreshCoins();
            });
          }
        });
      }
    });
  }
});

el("btn-story").addEventListener("click", function () {
  bootAudio();
  storyMode.open();
});

el("btn-story-back").addEventListener("click", function () {
  storyMode.closeJournal(function () {
    ui.showScreen("screen-title");
    updateNotifs();
  });
});

el("btn-cg-login").addEventListener("click", function () {
  bootAudio();
  showCgAuthPrompt();
});

el("btn-ranked").addEventListener("click", async function () {
  bootAudio();
  const profile = await accountReady();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  ui.showScreen(null);
  town.setActive(true);
  town.startRoadWalk();
  startSearch();
});

el("btn-minigames").addEventListener("click", function () {
  bootAudio();
  goStation("range", function () {
    showStationBar(t("mgHint"));
  });
});

el("btn-station-back").addEventListener("click", function () {
  hideStationBar();
  leaveStation();
});

refreshTownTexts();
if (isTouch) {
  document.body.classList.add("touch");
}

el("btn-search-cancel").addEventListener("click", function () {
  stopSearch();
  returnToMenu();
});

el("btn-training").addEventListener("click", function () {
  bootAudio();
  startTrainingDuel();
});

function seasonDaysLeft() {
  const days = Math.floor(Date.now() / 86400000);
  return 30 - ((days - 20630) % 30);
}

function refreshBoardTexture() {
  let title = t("boardTitle");
  if (seasonData !== null) {
    title += " - " + t("seasonLabel") + " " + seasonData.season;
  }
  arena.refreshBoard(title, boardRows, t("seasonEnds", { n: seasonDaysLeft() }));
}

function fetchBoard() {
  return fetchLeaderboard().then(function (rows) {
    if (rows !== null) {
      boardRows = rows;
    }
    refreshBoardTexture();
  });
}

function patchBoardRow() {
  const profile = getProfile();
  if (profile === null || boardRows === null) {
    return;
  }
  let touched = false;
  for (const row of boardRows) {
    if (row.pseudo === profile.pseudo) {
      row.skin = profile.skin;
      row.accessories = profile.accessories;
      touched = true;
    }
  }
  if (touched) {
    refreshBoardTexture();
  }
}

el("btn-board").addEventListener("click", function () {
  bootAudio();
  if (!netAvailable()) {
    alert(t("connectError"));
    return;
  }
  fetchBoard();
  goStation("board", function () {
    showStationBar("");
  });
});

el("btn-help").addEventListener("click", function () {
  bootAudio();
  ui.showScreen("screen-help");
});

el("btn-help-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

function updatePlayersOnline() {
  const node = el("players-online");
  if (node === null) {
    return;
  }
  if (!netAvailable() || getProfile() === null) {
    node.classList.add("hidden");
    return;
  }
  const n = Math.max(1, onlineCount());
  node.textContent = t("playersOnline", { n: n });
  node.classList.remove("hidden");
}

function renderPatchNotes() {
  const list = el("patch-list");
  list.innerHTML = "";
  for (const entry of patchNotes(getLang())) {
    const card = document.createElement("div");
    card.className = "patch-card";
    const head = document.createElement("div");
    head.className = "patch-date";
    head.textContent = entry.date + " - v" + entry.version;
    card.appendChild(head);
    const ul = document.createElement("ul");
    for (const item of entry.items) {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    }
    card.appendChild(ul);
    list.appendChild(card);
  }
}

el("btn-patch").addEventListener("click", function () {
  bootAudio();
  renderPatchNotes();
  ui.showScreen("screen-patch");
});

el("btn-patch-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

let challengePeriod = "daily";
let challengeData = null;

function renderPassPanel() {
  let title = t("passTitle");
  if (passData !== null) {
    title += " - " + t("seasonLabel") + " " + passData.season;
  }
  el("pass-screen-title").textContent = title;
  el("pass-screen-sub").textContent = t("seasonEnds", { n: seasonDaysLeft() });
  const grid = el("pass-grid");
  grid.innerHTML = "";
  if (passData === null) {
    return;
  }
  const xp = passData.xp;
  const level = Math.min(30, Math.floor(xp / 200));
  el("pass-progress-label").textContent = t("passLevel", { n: level }) + " - " + xp + " XP";
  const claimed = passData.claimed || [];
  for (let i = 1; i <= 30; i++) {
    const reward = passData.rewards[i - 1];
    const cell = document.createElement("div");
    cell.className = "pass-cell";
    const seg = document.createElement("div");
    seg.className = "pass-seg";
    const segFill = document.createElement("div");
    segFill.className = "pass-seg-fill";
    const frac = Math.max(0, Math.min(1, (xp - (i - 1) * 200) / 200));
    segFill.style.width = Math.round(frac * 100) + "%";
    seg.appendChild(segFill);
    cell.appendChild(seg);
    const lvl = document.createElement("div");
    lvl.className = "pass-lvl";
    lvl.textContent = String(i);
    cell.appendChild(lvl);
    if (reward.kind === "coins") {
      const txt = document.createElement("div");
      txt.className = "pass-coins";
      txt.textContent = reward.amount + " 🪙";
      cell.appendChild(txt);
    } else {
      cell.classList.add("rarity-epic");
      const txt = document.createElement("div");
      txt.className = "pass-draw";
      txt.textContent = "🎁";
      cell.appendChild(txt);
      const tag = document.createElement("div");
      tag.className = "pass-draw-tag";
      tag.textContent = t("passDraw");
      cell.appendChild(tag);
    }
    const unlocked = xp >= i * 200;
    const isClaimed = claimed.indexOf(i) !== -1;
    if (isClaimed) {
      cell.classList.add("claimed");
    } else if (unlocked) {
      cell.classList.add("claimable");
      const level = i;
      cell.onclick = async function () {
        const res = await claimPassLevel(level);
        if (res === null) {
          return;
        }
        passData.claimed.push(level);
        renderPassPanel();
        refreshCoins();
        renderProfileChip();
        updateNotifs();
        if (res.kind === "draw") {
          audio.wheelWin();
        } else {
          audio.coin();
        }
      };
    } else {
      cell.classList.add("locked");
    }
    grid.appendChild(cell);
  }
}

async function openPass() {
  bootAudio();
  const profile = await accountReady();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  passData = await passStateFetch();
  if (passData !== null && Number.isFinite(passData.xp)) {
    profile.xp = passData.xp;
  }
  renderPassPanel();
  ui.showScreen("screen-pass");
}

el("btn-pass").addEventListener("click", openPass);

el("btn-pass-back").addEventListener("click", function () {
  markPassSeen();
  updateNotifs();
  ui.showScreen("screen-title");
});

el("pass-grid").addEventListener("wheel", function (e) {
  e.preventDefault();
  el("pass-grid").scrollLeft += e.deltaY;
}, { passive: false });

function challengeLabel(def) {
  const params = { goal: def.goal };
  if (def.stat === "played") {
    return t("chPlayed", params);
  }
  if (def.stat === "won") {
    return t("chWon", params);
  }
  if (def.stat === "ranked_won") {
    return t("chRankedWon", params);
  }
  if (def.stat === "heads") {
    return t("chHeads", params);
  }
  if (def.stat === "shots") {
    return t("chShots", params);
  }
  return t("chHits", params);
}

function renderChallenges() {
  const list = el("ch-list");
  const msg = el("ch-msg");
  el("ch-tab-daily").classList.toggle("active", challengePeriod === "daily");
  el("ch-tab-weekly").classList.toggle("active", challengePeriod === "weekly");
  list.innerHTML = "";
  if (challengeData === null) {
    msg.textContent = t("challengesLogin");
    msg.classList.remove("hidden");
    return;
  }
  const bucket = challengeData[challengePeriod];
  if (!bucket) {
    return;
  }
  msg.classList.add("hidden");
  const counters = bucket.counters || {};
  const claimed = bucket.claimed || [];
  for (const def of bucket.defs) {
    const cur = Math.min(def.goal, Number(counters[def.stat] || 0));
    const isClaimed = claimed.indexOf(def.id) !== -1;
    const done = cur >= def.goal;
    const row = document.createElement("div");
    row.className = "ch-item";
    if (isClaimed) {
      row.classList.add("claimed");
    }
    const info = document.createElement("div");
    info.className = "ch-info";
    const label = document.createElement("div");
    label.className = "ch-label";
    label.textContent = challengeLabel(def);
    const bar = document.createElement("div");
    bar.className = "ch-bar";
    const fill = document.createElement("div");
    fill.className = "ch-fill";
    fill.style.width = Math.round((cur / def.goal) * 100) + "%";
    bar.appendChild(fill);
    const prog = document.createElement("div");
    prog.className = "ch-prog";
    prog.textContent = cur + " / " + def.goal;
    info.appendChild(label);
    info.appendChild(bar);
    info.appendChild(prog);
    const reward = document.createElement("div");
    reward.className = "ch-reward";
    reward.textContent = "+" + def.reward + " XP";
    const btn = document.createElement("button");
    btn.className = "btn btn-small ch-claim";
    if (isClaimed) {
      btn.textContent = t("challengesClaimed");
      btn.disabled = true;
    } else if (done) {
      btn.textContent = t("challengesClaim");
      btn.onclick = function () {
        doClaim(challengePeriod, def.id, btn);
      };
    } else {
      btn.textContent = t("challengesClaim");
      btn.disabled = true;
    }
    row.appendChild(info);
    row.appendChild(reward);
    row.appendChild(btn);
    list.appendChild(row);
  }
}

async function doClaim(period, index, btn) {
  btn.disabled = true;
  const result = await claimChallenge(period, index);
  if (result === null) {
    btn.disabled = false;
    return;
  }
  bootAudio();
  audio.coin();
  challengeData = await challengeState();
  renderProfileChip();
  renderChallenges();
}

async function refreshChallenges() {
  if (!netAvailable()) {
    return;
  }
  if (getProfile() === null) {
    challengeData = null;
    renderChallenges();
    return;
  }
  challengeData = await challengeState();
  renderChallenges();
}

let eventData = null;

function eventTimeLeftLabel(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  if (d > 0) {
    return t("evLeftDH", { d: d, h: h });
  }
  return t("evLeftHM", { h: h, m: m });
}

async function refreshEventBanner() {
  if (!netAvailable() || getProfile() === null) {
    return;
  }
  const ev = await eventState();
  eventData = ev;
  renderEventBanner(ev);
}

function eventRewardInfo(ev) {
  if (ev.reward_kind === "coins") {
    return { icon: null, name: "+" + ev.reward_amount + " 🪙" };
  }
  if (ev.reward_kind === "skin") {
    return { icon: portraitDataUrl(ev.reward_ref, 64), name: t(skinById(ev.reward_ref).nameKey) };
  }
  if (ev.reward_kind === "weapon") {
    const w = weaponById(ev.reward_ref);
    return { icon: weaponIconDataUrl(ev.reward_ref, 64), name: w ? t(w.nameKey) : "" };
  }
  if (ev.reward_kind === "accessory") {
    const a = accessoryById(ev.reward_ref);
    return { icon: accessoryIconDataUrl(ev.reward_ref, 64), name: a ? t(a.nameKey) : "" };
  }
  return { icon: null, name: "" };
}

function renderEventBanner(ev) {
  const banner = el("event-banner");
  if (ev === null || !ev.id) {
    banner.classList.add("hidden");
    return;
  }
  const left = new Date(ev.ends_at).getTime() - Date.now();
  const cur = Math.min(Number(ev.counter), Number(ev.goal));

  if (left <= -86400000) {
    banner.classList.add("hidden");
    return;
  }

  const isFailed = left <= 0 && cur < ev.goal;
  const evItem = el("ev-item");
  banner.style.filter = "none";
  banner.style.opacity = "1";
  banner.style.animation = "rgbBorder 6s linear infinite";
  banner.style.borderColor = "transparent";

  if (ev.claimed || isFailed) {
    evItem.classList.add("claimed");
    evItem.style.pointerEvents = "none";
  } else {
    evItem.classList.remove("claimed");
    evItem.style.pointerEvents = "auto";
  }

  const titleStr = t(ev.title);
  const titleEl = el("ev-title");
  
  function fitTitle() {
    titleEl.style.fontSize = "16px";
    titleEl.style.whiteSpace = "nowrap";
    let size = 16;
    while (titleEl.scrollWidth > titleEl.clientWidth && size > 10) {
      size--;
      titleEl.style.fontSize = size + "px";
    }
  }

  titleEl.textContent = (ev.icon || "⭐") + " " + titleStr;
  fitTitle();

  if (titleStr === ev.title) {
    autoTranslate(ev.title, "fr").then(function(translated) {
      titleEl.textContent = (ev.icon || "⭐") + " " + translated;
      fitTitle();
    });
  }

  el("ev-count").textContent = cur + "/" + ev.goal;
  el("ev-fill").style.width = Math.round((cur / ev.goal) * 100) + "%";
  el("ev-desc").textContent = challengeLabel(ev);
  const rew = eventRewardInfo(ev);
  const rewIcon = el("ev-reward-icon");
  if (rew.icon) {
    rewIcon.src = rew.icon;
    rewIcon.classList.remove("hidden");
  } else {
    rewIcon.classList.add("hidden");
  }
  el("ev-reward-name").textContent = rew.name;
  const btn = el("btn-ev-claim");
  const timeEl = el("ev-time");
  timeEl.textContent = left > 0 ? "⏳ " + eventTimeLeftLabel(left) : "⏳ " + t("evEnded");
  
  timeEl.classList.remove("hidden");
  btn.classList.remove("hidden");

  if (ev.claimed) {
    btn.disabled = true;
    btn.textContent = t("challengesClaimed");
  } else if (cur >= Number(ev.goal)) {
    btn.disabled = false;
    btn.textContent = t("challengesClaim");
  } else {
    btn.disabled = true;
    btn.textContent = t("challengesClaim");
  }
  banner.classList.remove("hidden");
}

el("btn-ev-claim").addEventListener("click", async function () {
  if (eventData === null || eventData.claimed) {
    return;
  }
  const btn = el("btn-ev-claim");
  btn.disabled = true;
  const res = await eventClaim(eventData.id);
  if (res === null) {
    btn.disabled = false;
    return;
  }
  audio.coin();
  let html = "";
  if (res.reward_kind === "skin") {
    html += '<img class="popup-badge" src="' + portraitDataUrl(res.reward_ref, 96) + '" alt="" />';
  } else if (res.reward_kind === "weapon") {
    html += '<img class="popup-badge" src="' + weaponIconDataUrl(res.reward_ref, 96) + '" alt="" />';
  } else if (res.reward_kind === "accessory") {
    html += '<img class="popup-badge" src="' + accessoryIconDataUrl(res.reward_ref, 96) + '" alt="" />';
  }
  if (res.duplicate) {
    html += '<div class="popup-prime">+' + res.refund + " 🪙</div>";
    html += "<p>" + t("evDup") + "</p>";
  } else if (res.reward_kind === "coins") {
    html += '<div class="popup-prime">+' + res.reward_amount + " 🪙</div>";
  } else if (res.reward_kind === "skin") {
  }
  showPopup("⭐ " + eventData.title, html);
  renderProfileChip();
  refreshCoins();
  renderInventory();
  refreshEventBanner();
});

el("ch-tab-daily").addEventListener("click", function () {
  challengePeriod = "daily";
  renderChallenges();
});

el("ch-tab-weekly").addEventListener("click", function () {
  challengePeriod = "weekly";
  renderChallenges();
});

el("challenges-toggle").addEventListener("click", function () {
  el("challenges-bar").classList.toggle("open");
});

function openLegal(kind) {
  const page = legalPage(getLang(), kind);
  el("legal-title").textContent = page.title;
  el("legal-body").innerHTML = page.body;
  el("legal-modal").classList.remove("hidden");
}

el("lnk-terms").addEventListener("click", function () {
  openLegal("terms");
});

el("lnk-privacy").addEventListener("click", function () {
  openLegal("privacy");
});

el("lnk-credits").addEventListener("click", function () {
  const page = creditsPage(getLang());
  el("legal-title").textContent = page.title;
  el("legal-body").innerHTML = page.body;
  el("legal-modal").classList.remove("hidden");
});

el("legal-close").addEventListener("click", function () {
  el("legal-modal").classList.add("hidden");
});

let lastTime = performance.now();
function loop() {
  requestAnimationFrame(loop);
  if (isAdPlaying) {
    lastTime = performance.now();
    return;
  }
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  let scaled = dt;
  if (activeDuel !== null) {
    scaled = dt * activeDuel.timeScale(now);
  } else if (activeMinigame !== null && activeMinigame.timeScale) {
    scaled = dt * activeMinigame.timeScale(now);
  }
  arena.update(scaled);
  cowboy.update(scaled);
  viewmodel.update(scaled);
  if (activeDuel !== null) {
    activeDuel.update(now, scaled);
  } else if (activeMinigame !== null) {
    activeMinigame.update(now, scaled);
  } else if (storyMode.isActive()) {
    storyMode.update(scaled);
  } else {
    town.update(scaled);
  }
  composer.render();
  updateViewer(dt);
}

let bootPct = 0;
let bootTimer = null;

function setBootPct(value) {
  bootPct = value;
  const label = el("boot-pct");
  const fill = el("boot-bar-fill");
  if (label !== null) {
    label.textContent = Math.round(value) + "%";
  }
  if (fill !== null) {
    fill.style.width = value + "%";
  }
}

function startBootProgress() {
  setBootPct(0);
  bootTimer = setInterval(function () {
    if (bootPct < 90) {
      setBootPct(bootPct + Math.max(0.6, (90 - bootPct) * 0.07));
    }
  }, 90);
}

function finishBootProgress() {
  if (bootTimer !== null) {
    clearInterval(bootTimer);
    bootTimer = null;
  }
  setBootPct(100);
}

function runMenuGuide() {
  if (el("guide-overlay") !== null) {
    return;
  }
  const steps = [
    { id: "profile-chip", key: "guideProfile" },
    { id: "btn-ranked", key: "guideRanked" },
    { id: "btn-story", key: "guideStory" },
    { id: "btn-shop", key: "guideShop" },
    { id: "btn-board", key: "guideBoard" },
    { id: "btn-minigames", key: "guideMinigames" },
    { id: "btn-pass", key: "guidePass" },
    { id: "btn-friends", key: "guideFriends" },
    { id: "challenges-toggle", key: "guideChallenges" }
  ];
  const overlay = document.createElement("div");
  overlay.id = "guide-overlay";
  const hole = document.createElement("div");
  hole.id = "guide-hole";
  const bubble = document.createElement("div");
  bubble.id = "guide-bubble";
  const text = document.createElement("p");
  const next = document.createElement("button");
  next.className = "btn btn-small";
  bubble.appendChild(text);
  bubble.appendChild(next);
  overlay.appendChild(hole);
  overlay.appendChild(bubble);
  document.body.appendChild(overlay);
  let i = 0;
  function finish() {
    overlay.remove();
    localStorage.setItem("hn-guide-seen", "1");
  }
  function show() {
    while (i < steps.length) {
      const t0 = el(steps[i].id);
      if (t0 !== null && t0.getBoundingClientRect().width > 0) {
        break;
      }
      i += 1;
    }
    if (i >= steps.length) {
      finish();
      return;
    }
    const target = el(steps[i].id);
    const r = target.getBoundingClientRect();
    hole.style.left = (r.left - 6) + "px";
    hole.style.top = (r.top - 6) + "px";
    hole.style.width = (r.width + 12) + "px";
    hole.style.height = (r.height + 12) + "px";
    text.textContent = t(steps[i].key);
    next.textContent = i === steps.length - 1 ? t("guideDone") : t("guideNext");
    const bw = 260;
    let bx = r.right + 18;
    if (bx + bw > window.innerWidth - 12) {
      bx = Math.max(12, r.left - bw - 18);
    }
    if (bx < 12) {
      bx = 12;
    }
    bubble.style.left = bx + "px";
    let by = Math.max(12, r.top - 6);
    bubble.style.top = by + "px";
    const bh = bubble.offsetHeight;
    if (by + bh > window.innerHeight - 12) {
      by = Math.max(12, window.innerHeight - 12 - bh);
      bubble.style.top = by + "px";
    }
  }
  next.onclick = function () {
    audio.uiClick();
    i += 1;
    show();
  };
  show();
}

async function boot() {
  await initSdk();
  restoreStoryBackup();
  loadingStart();
  if (isCrazyGames()) {
    const footer = document.querySelector(".footer-note");
    footer.classList.add("hidden");
    el("btn-home-ad").classList.remove("hidden");
  }
  if (netAvailable()) {
    el("profile-chip").classList.remove("hidden");
    el("profile-chip").classList.add("loading");
    el("chip-pseudo").textContent = localPseudo();
    el("chip-head").src = portraitDataUrl("drifter", 128);
  }
  try {
    await initAccount();
  } catch (err) {}
  if (netAvailable() && getProfile() === null) {
    await ensureAccount();
  }
  el("profile-chip").classList.remove("loading");
  renderProfileChip();
  checkBanned();
  if (netAvailable()) {
    el("friends-bar").classList.remove("hidden");
    el("challenges-bar").classList.remove("hidden");
    el("challenges-toggle").classList.remove("hidden");
    renderFriends();
    renderChallenges();
    await initSocial();
  }

  loadingStop();
  finishBootProgress();
  setTimeout(function () {
    el("boot-loading").classList.add("hidden");
  }, 240);
  menuMusicAllowed = true;
  maybeStartMenuMusic();
  let joinCode = getInviteParam("roomId");
  if (joinCode === null) {
    const params = new URLSearchParams(location.search);
    joinCode = params.get("duel");
  }
  if (joinCode !== null && joinCode !== "" && netAvailable()) {
    history.replaceState({}, "", location.pathname);
    accountReady();
    openFriendRoom(joinCode, false);
    return;
  }
  if (isInstantMultiplayer() && netAvailable()) {
    accountReady();
    openFriendRoom(makeFriendCode(), true);
    return;
  }
  if (!hadAccount && localStorage.getItem("hn-onboarded") === null) {
    localStorage.setItem("hn-onboarded", "1");
    localStorage.setItem("hn-notes-seen", LATEST_VERSION);
    showPopup(t("welcomeTitle"), t("welcomeBody"), function () {
      runMenuGuide();
    });
    return;
  }
  maybeShowNotesPopup();
  maybeShowSeasonPopup();
}

el("backdrop").classList.add("hidden");
town.setActive(true);
town.goHome(true);
ui.showScreen("screen-title");

startBootProgress();
try {
  arena.renderer.compile(arena.scene, arena.camera);
} catch (err) {}
loop();
boot();
