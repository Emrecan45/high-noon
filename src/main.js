import * as THREE from "three";
import { createArena } from "./scene.js";
import { createTown } from "./town.js";
import { createCowboy } from "./cowboy.js";
import { createViewmodel } from "./viewmodel.js";
import { createUi } from "./ui.js";
import { AudioEngine } from "./audio.js";
import { createMusic } from "./music.js";
import { AiOpponent, TRAINING_PERSONA } from "./ai.js";
import { restoreStoryBackup } from "./story.js";
import { createStoryMode } from "./storymode.js";
import { Gallery } from "./gallery.js";
import { Duel } from "./duel.js";
import { createRng, randomSeed } from "./rng.js";
import { netAvailable, createMatchmaker, createPrivateRoom, goOnline, isOnline, onlineCount, onlineState, setOnlineState, listenChallenges, sendChallenge, sendChallengeReply, notifyFriendsChange } from "./net.js";
import { getLang, setLang, t, applyStatic } from "./i18n.js";
import { initSdk, isCrazyGames, loadingStart, loadingStop, requestMidgameAd, requestRewardedAd, getCgUser, getInviteParam, inviteLink, showInviteButton, hideInviteButton, isInstantMultiplayer } from "./sdk.js";
import { initAccount, getProfile, ensureAccount, localPseudo, ownedSkins, ownedAccessories, ownedWeaponsSet, equipSkin, equipAccessories, equipWeapon, spinWheel, reportResult, recordStats, claimAdReward, challengeState, claimChallenge, fetchLeaderboard, listFriends, sendFriendRequest, respondFriendRequest, removeFriend, cgFriendsResolved, seasonInfo, passStateFetch, claimPassLevel, adState, adCase, adDouble, adWatchItem, minigameXp, storyXp, storyReward, freeDraws } from "./account.js";
import { SKINS, skinById, portraitDataUrl, aiSkinFor, rarityOf } from "./skins.js";
import { ACCESSORIES, accessoryById, accessoryIconDataUrl, accessoryRarity, seasonBadgeInfo } from "./accessories.js";
import { WEAPONS, weaponById, weaponIconDataUrl } from "./weapons.js";
import { patchNotes, legalPage, creditsPage, LATEST_VERSION } from "./pages.js";
import pkg from "../package.json";

const arena = createArena(document.getElementById("game"));
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
  arena.setTownLabels(t("mgBirdsName").toUpperCase(), t("mgCoachName").toUpperCase());
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
  return data;
}

document.addEventListener("click", function (e) {
  const data = pickInteractable(e);
  if (data === null) {
    return;
  }
  bootAudio();
  audio.uiClick();
  if (data.action === "birds") {
    hideStationBar();
    startGallery("birds", null);
  } else if (data.action === "coach") {
    hideStationBar();
    startGallery("coach", null);
  }
});

document.addEventListener("mousemove", function (e) {
  if (activeDuel !== null || activeMinigame !== null) {
    return;
  }
  const data = pickInteractable(e);
  document.body.style.cursor = data !== null ? "pointer" : "";
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
  if (!el("screen-patch").classList.contains("hidden")) {
    renderPatchNotes();
  }
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
  showPopup(t("notesTitle") + " · v" + entry.version, html);
}

function maybeShowSeasonPopup() {
  if (seasonData === null) {
    return;
  }
  let html = "";
  if (seasonData.prev && Number.isFinite(Number(seasonData.prev.elo))) {
    html += "<p>" + t("seasonPopupBody", { s: seasonData.prev.season, r: seasonData.prev.rank }) + "</p>";
    html += '<div class="popup-prime">' + seasonData.prev.elo + " $</div>";
    html += "<p>" + t("seasonPopupNow", { s: seasonData.season }) + "</p>";
  }
  if (seasonData.badge) {
    const badgeId = "sbadge-s" + seasonData.badge.season + "-r" + seasonData.badge.rank;
    html += '<img class="popup-badge" src="' + accessoryIconDataUrl(badgeId, 96) + '" alt="" />';
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
    playerBody.setAccessories([]);
    playerBody.setWeapon(weaponById("iron").colors);
    return;
  }
  playerBody.setSkin(skinById(profile.skin).colors);
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
  town.goHome(false, function () {
    ui.showScreen("screen-title");
  });
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

function renderProfileChip() {
  const profile = getProfile();
  refreshTownCharacter();
  const chip = el("profile-chip");
  if (profile !== null) {
    el("chip-head").src = portraitDataUrl(profile.skin, 128, profile.accessories);
    el("chip-pseudo").textContent = profile.pseudo;

  } else {
    el("chip-head").src = portraitDataUrl("drifter", 128);
    el("chip-pseudo").textContent = localPseudo();

  }
  chip.classList.remove("hidden");
  refreshCoins();
}

function refreshCoins() {
  const profile = getProfile();
  const badge = el("coins-badge");
  if (profile === null || activeDuel !== null || activeMinigame !== null || storyMode.isActive()) {
    badge.classList.add("hidden");
    return;
  }
  el("coins-value").textContent = String(profile.coins);
  badge.classList.remove("hidden");
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
  }
  return profile;
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
    return "Top " + acc.badge.rank + " · " + t("seasonLabel") + " " + acc.badge.season;
  }
  return t(acc.nameKey);
}

function renderStatsBlock() {
  const profile = getProfile();
  const block = el("stats-block");
  block.innerHTML = "";

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
    statRow(block, t("seasonLabel") + " " + entry.season, entry.elo + " $");
  }
}

function invItem(iconUrl, name, equipped, locked, onClick, rarity) {
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
  const img = document.createElement("img");
  img.src = iconUrl;
  const label = document.createElement("div");
  label.className = "inv-name";
  label.textContent = name;
  item.appendChild(img);
  item.appendChild(label);
  if (!locked) {
    item.onclick = onClick;
  }
  return item;
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
  for (const skin of SKINS) {
    const isOwned = owned.has(skin.id);
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
    }, rarityOf(skin.price)));
  }
  const weaponRow = el("inv-weapons");
  weaponRow.innerHTML = "";
  for (const weapon of WEAPONS) {
    const isOwned = ownedWp.has(weapon.id);
    const isEquipped = profile.weapon === weapon.id;
    weaponRow.appendChild(invItem(weaponIconDataUrl(weapon.id, 88), t(weapon.nameKey), isEquipped, !isOwned, async function () {
      if (isEquipped) {
        return;
      }
      audio.equip();
      await equipWeapon(weapon.id);
      renderInventory();
      refreshViewerModel();
    }, rarityOf(weapon.price)));
  }
  const accRow = el("inv-acc");
  accRow.innerHTML = "";
  const equipped = equippedAccList();
  const accList = ACCESSORIES.slice();
  const badgeIds = [];
  for (const ownedId of ownedAcc) {
    if (seasonBadgeInfo(ownedId) !== null) {
      badgeIds.push(ownedId);
    }
  }
  badgeIds.sort();
  for (const badgeId of badgeIds) {
    accList.push(accessoryById(badgeId));
  }
  
  const accGroups = {};
  for (const acc of accList) {
    const s = acc.slot || "other";
    if (!accGroups[s]) {
      accGroups[s] = [];
    }
    accGroups[s].push(acc);
  }
  
  for (const slot in accGroups) {
    const grid = document.createElement("div");
    grid.className = "inv-grid";
    grid.style.marginBottom = "20px";
    for (const acc of accGroups[slot]) {
      const isOwned = ownedAcc.has(acc.id);
      const isEquipped = equipped.indexOf(acc.id) !== -1;
      grid.appendChild(invItem(accessoryIconDataUrl(acc.id, 88), accName(acc), isEquipped, !isOwned, async function () {
        let next = equippedAccList();
        if (isEquipped) {
          next = next.filter(function (id) {
            return id !== acc.id;
          });
        } else {
          next = next.filter(function (id) {
            const other = accessoryById(id);
            return other === null || other.slot !== acc.slot;
          });
          next.push(acc.id);
        }
        audio.equip();
        await equipAccessories(next);
        renderInventory();
        refreshViewerModel();
      }, accessoryRarity(acc.id)));
    }
    accRow.appendChild(grid);
  }
  setInvTab(invTab);
}

el("inv-tab-skins").addEventListener("click", function () {
  setInvTab("skins");
});

el("inv-tab-weapons").addEventListener("click", function () {
  setInvTab("weapons");
});

el("inv-tab-acc").addEventListener("click", function () {
  setInvTab("acc");
});

async function openProfile() {
  bootAudio();
  const profile = await accountReady();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  el("profile-name").textContent = profile.pseudo;
  el("profile-poster-fig").src = portraitDataUrl(profile.skin, 340, profile.accessories);
  el("profile-poster-name").textContent = profile.pseudo;
  el("profile-poster-name").classList.toggle("di-long", profile.pseudo.length > 12);
  el("profile-poster-title").textContent = profile.elo + " $";
  renderStatsBlock();
  renderCareer();
  goStation("profile", function () {
    ui.showScreen("screen-profile");
  });
}

el("btn-copy-id").addEventListener("click", function () {
  const profile = getProfile();
  if (profile === null || !profile.friend_code) {
    return;
  }
  navigator.clipboard.writeText(profile.friend_code).catch(function () {});
  el("btn-copy-id").textContent = t("copiedId");
  setTimeout(function () {
    el("btn-copy-id").textContent = t("copyId");
  }, 1600);
});

function openInventory() {
  renderInventory();
  ui.showScreen("screen-inventory");
}

el("profile-chip").addEventListener("click", openProfile);
el("btn-customize").addEventListener("click", openInventory);
el("btn-inv-back").addEventListener("click", function () {
  playerBody.holdGun(false);
  ui.showScreen("screen-profile");
});

el("btn-profile-back").addEventListener("click", function () {
  leaveStation();
});

const caseItems = [];
for (const skin of SKINS) {
  if (skin.id !== "drifter") {
    caseItems.push({ kind: "skin", ref: skin.id, nameKey: skin.nameKey, icon: portraitDataUrl(skin.id, 64), rarity: rarityOf(skin.price) });
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
    const tick = function () {
      const now = new Date();
      const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const left = Math.max(0, Math.floor((next - now.getTime()) / 1000));
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
    const tick = function () {
      const now = new Date();
      const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const left = Math.max(0, Math.floor((next - now.getTime()) / 1000));
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
        spinning = true;
        el("btn-spin").disabled = true;
        el("btn-ad-case").disabled = true;
        el("wheel-result").classList.add("hidden");
        audio.whoosh();
        runCaseAnimation(result, function () {
          spinning = false;
          el("btn-spin").disabled = false;
          refreshCoins();
          renderAdItems();
          const item = caseItemFor(result.kind, result.ref);
          const resultNode = el("wheel-result");
          if (result.duplicate) {
            audio.coin();
            resultNode.textContent = t("wheelDup", { item: t(item.nameKey) });
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
  el("btn-spin").disabled = true;
  resultNode.classList.add("hidden");
  audio.whoosh();
  runCaseAnimation(result, function () {
    spinning = false;
    el("btn-spin").disabled = false;
    refreshCoins();
    refreshSpinButton();
    const item = caseItemFor(result.kind, result.ref);
    if (result.duplicate) {
      audio.coin();
      resultNode.textContent = t("wheelDup", { item: t(item.nameKey) });
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
  }, refreshFriends);
  listenChallenges(profile.id, onChallenge, onChallengeReply, refreshFriends);
  refreshFriends();
  await refreshChallenges();
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
  if (isCrazyGames()) {
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
}

function friendAvatar(entry) {
  const img = document.createElement("img");
  img.src = portraitDataUrl(entry.skin, 60);
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
    row.className = "friend-row";
    const main = document.createElement("div");
    main.className = "friend-main";
    const name = document.createElement("div");
    name.className = "friend-name";
    name.textContent = entry.pseudo;
    const sub = document.createElement("div");
    sub.className = "friend-sub";
    main.appendChild(name);
    main.appendChild(sub);
    row.appendChild(friendAvatar(entry));
    row.appendChild(main);
    if (entry.cg) {
      const online = entry.profileId !== null && isOnline(entry.profileId);
      const ready = entry.profileId !== null && online && onlineState(entry.profileId) !== "game" && onlineState(entry.profileId) !== "matchmaking";
      if (entry.elo !== null) {
        sub.textContent = entry.elo + " $";
      } else {
        sub.textContent = "";
      }
      const dot = document.createElement("span");
      dot.className = "dot";
      if (online) {
        dot.classList.add("on");
      }
      row.appendChild(dot);
      if (ready) {
        row.appendChild(friendButton(t("friendsChallenge"), false, function () {
          challengeOnline(entry.profileId);
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
      sub.textContent = entry.elo + " $";
      const dot = document.createElement("span");
      dot.className = "dot";
      if (online) {
        dot.classList.add("on");
      }
      row.appendChild(dot);
      const duelBtn = friendButton(t("friendsChallenge"), false, function () {
        challengeOnline(entry.id);
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
    if (result.target) {
      notifyFriendsChange(result.target);
    }
    refreshFriends();
  } else if (result.reason === "notfound") {
    setAddMsg(t("friendsNotFound"), false);
  } else if (result.reason === "already") {
    setAddMsg(t("friendsAlready"), false);
  } else {
    setAddMsg(t("accountError"), false);
  }
});

el("btn-friends").addEventListener("click", function () {
  renderFriends();
  bootAudio();
  el("friends-bar").classList.toggle("open");
});

el("friends-close").addEventListener("click", function () {
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
  if (activeDuel !== null || activeMinigame !== null || storyMode.isActive()) {
    return;
  }
  if (town.isBusy()) {
    return;
  }
  if (el("friends-bar").classList.contains("open")) {
    el("friends-bar").classList.remove("open");
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

function challengeOnline(profileId) {
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
  openFriendRoom(code, true, true);
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
    leaveStation();
    pendingChallengeCode = null;
    hideInviteButton();
    el("friend-block").classList.add("hidden");
    el("search-timer").classList.add("hidden");
    el("search-found-name").classList.add("hidden");
    el("btn-search-cancel").classList.add("hidden");
    showToast(t("challengeDeclined"), null, null, 4000);
  } else if (payload.accepted === true && code === pendingChallengeCode) {
    pendingChallengeCode = null;
  }
}

function resetDuelScene() {
  cowboy.reset();
  cowboy.setSkin(skinById("drifter").colors);
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

function backToMenu() {
  activeDuel = null;
  setOnlineState("menu");
  resetDuelScene();
  arena.setRangeProps(true);
  cowboy.group.visible = false;
  town.setActive(true);
  town.warpTo("home");
  music.setMode("menu");
  hideStationBar();
  refreshTownTexts();
  ui.showScreen("screen-title");
  renderProfileChip();
  refreshChallenges();
  requestMidgameAd({ onStart: adMuteOn, onDone: adMuteOff });
}

function duelProfile() {
  const profile = getProfile();
  if (profile === null) {
    return { id: null, pseudo: localPseudo(), skin: "drifter", acc: [], weapon: "iron", elo: 100 };
  }
  return { id: profile.id, pseudo: profile.pseudo, skin: profile.skin, acc: profile.accessories, weapon: profile.weapon, elo: profile.elo };
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
      fetchBoard();
      const reward = el("matchend-reward");
      if (reward === null) {
        return;
      }
      if (ranked) {
        let deltaStr = result.elo_delta + " $";
        if (result.elo_delta >= 0) {
          deltaStr = "+" + result.elo_delta + " $";
        }
        reward.innerHTML =
          '<div class="me-rank">' + deltaStr + "</div>" +
          "<div>+" + result.coins_delta + " 🪙</div>";
      } else {
        reward.textContent = "+" + result.coins_delta + " 🪙";
      }
      reward.classList.remove("hidden");
      if (isCrazyGames() && result.coins_delta > 0) {
        const btnD = el("btn-double-ad");
        btnD.textContent = t("adDouble", { n: result.coins_delta });
        btnD.disabled = false;
        btnD.classList.remove("hidden");
      }
    });
  };
}

el("btn-double-ad").addEventListener("click", function () {
  const btnD = el("btn-double-ad");
  btnD.disabled = true;
  requestRewardedAd({
    onStart: adMuteOn,
    onFinish: function () {
      adMuteOff();
      adDouble().then(function (res) {
        btnD.classList.add("hidden");
        if (res === null) {
          return;
        }
        audio.coin();
        refreshCoins();
        renderProfileChip();
      });
    },
    onError: function () {
      adMuteOff();
      btnD.disabled = false;
      showToast(t("shopAdFail"), null, null, 4000);
    }
  });
});

function startCombatMusic() {
  bootAudio();
  music.start();
  music.setMode("combat");
}

function prepGalleryScene() {
  town.setActive(false);
  hideStationBar();
  arena.setRangeProps(false);
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
    onExit: exitGallery,
    onReward: grantMinigameXp
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
  arena.setRangeProps(true);
  backToMenu();
}

async function grantMinigameXp(kind, score) {
  const res = await minigameXp(kind, score);
  if (res === null || !(res.xp_gained > 0)) {
    return;
  }
  if (el("screen-matchend").classList.contains("hidden")) {
    return;
  }
  const line = document.createElement("div");
  line.className = "me-reward";
  line.textContent = "+" + res.xp_gained + " XP";
  el("matchend-detail").appendChild(line);
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

function openFriendRoom(rawCode, hosting, isChallenge = false) {
  const code = String(rawCode).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
  if (code.length < 4) {
    ui.showScreen("screen-title");
    return;
  }
  setOnlineState("matchmaking");
  if (hosting) {
    el("search-title").textContent = isChallenge ? t("challengeSent") : t("friendWait");
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
  playerBody: playerBody,
  cowboy: cowboy,
  youSpec: function () {
    const profile = duelProfile();
    return {
      colors: skinById(profile.skin).colors,
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
      onResult: baseResult,
      onCombat: startCombatMusic,
      oppColors: aiSkin.colors,
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
  onChapterDone: function (index, isLast) {
    arena.interiors.hideAll();
    arena.applyModifier({ id: "noon", sway: 0 }, 19);
    storyXp(index).then(function (res) {
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
        let html = "";
        if (img !== "") {
          html += '<img class="popup-badge" src="' + img + '" alt="" />';
        }
        if (res.duplicate) {
          html += "<p>" + t("stRewardDup", { item: itemName }) + "</p>";
        } else {
          html += "<p>" + t("stRewardItem", { item: itemName }) + "</p>";
        }
        if (res.reward_coins > 0) {
          html += '<div class="popup-prime">+' + res.reward_coins + " 🪙</div>";
        }
        if (res.xp_gained > 0) {
          html += "<p>+" + res.xp_gained + " XP</p>";
        }
        showPopup(t("stChapterDone", { n: index + 1 }), html);
        renderProfileChip();
        refreshCoins();
      } else {
        let label = t("stChapterDone", { n: index + 1 });
        if (res !== null && res.xp_gained > 0) {
          label += " · +" + res.xp_gained + " XP";
        }
        showToast(label, null, null, 5000);
      }
    });
    if (isLast) {
      storyReward().then(function (res) {
        backToMenu();
        let html = "<p>" + t("stFinaleBody") + "</p>";
        if (res !== null) {
          html += '<img class="popup-badge" src="' + portraitDataUrl("undertaker", 128) + '" alt="" />';
          if (res.duplicate) {
            html += "<p>" + t("stFinaleDup") + "</p>";
          } else {
            html += "<p>" + t("stFinaleSkin") + "</p>";
          }
        }
        showPopup(t("stFinaleTitle"), html);
        renderProfileChip();
        refreshCoins();
      });
    } else {
      backToMenu();
    }
  }
});

el("btn-story").addEventListener("click", function () {
  bootAudio();
  storyMode.open();
});

el("btn-story-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
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
  leaveStation();
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
    title += " · " + t("seasonLabel") + " " + seasonData.season;
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
    head.textContent = entry.date + " · v" + entry.version;
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
    title += " · " + t("seasonLabel") + " " + passData.season;
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
  el("pass-progress-label").textContent = t("passLevel", { n: level }) + " · " + xp + " XP";
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
        if (res.kind === "draw") {
          audio.wheelWin();
          openShop();
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
  } else if (activeMinigame !== null) {
    activeMinigame.update(now, scaled);
  } else if (storyMode.isActive()) {
    storyMode.update(scaled);
  } else {
    town.update(scaled);
  }
  arena.renderer.render(arena.scene, arena.camera);
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
loop();
boot();
