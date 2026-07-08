import * as THREE from "three";
import { createArena } from "./scene.js";
import { createCowboy } from "./cowboy.js";
import { createViewmodel } from "./viewmodel.js";
import { createUi } from "./ui.js";
import { AudioEngine } from "./audio.js";
import { createMusic } from "./music.js";
import { AiOpponent, PERSONAS } from "./ai.js";
import { Duel } from "./duel.js";
import { createRng, randomSeed } from "./rng.js";
import { netAvailable, createMatchmaker, createPrivateRoom, goOnline, isOnline, onlineCount, listenChallenges, sendChallenge } from "./net.js";
import { getLang, setLang, t, applyStatic } from "./i18n.js";
import { initSdk, isCrazyGames, loadingStart, loadingStop, requestMidgameAd, requestRewardedAd, getCgUser, getInviteParam, inviteLink, showInviteButton, hideInviteButton, isInstantMultiplayer } from "./sdk.js";
import { initAccount, getProfile, ensureAccount, localPseudo, ownedSkins, ownedAccessories, ownedWeaponsSet, equipSkin, equipAccessories, equipWeapon, spinWheel, reportResult, recordStats, claimAdReward, challengeState, claimChallenge, fetchLeaderboard, listFriends, sendFriendRequest, respondFriendRequest, removeFriend, cgFriendsResolved } from "./account.js";
import { SKINS, skinById, portraitDataUrl } from "./skins.js";
import { ACCESSORIES, accessoryById, accessoryIconDataUrl } from "./accessories.js";
import { WEAPONS, weaponById, weaponIconDataUrl } from "./weapons.js";
import { eloTitleKey } from "./titles.js";
import { patchNotes, legalPage } from "./pages.js";
import pkg from "../package.json";

const arena = createArena(document.getElementById("game"));
const cowboy = createCowboy();
arena.opponentAnchor.add(cowboy.group);
const playerBody = createCowboy();
playerBody.group.visible = false;
arena.scene.add(playerBody.group);
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
let copyTimer = null;
let socialReady = false;
let friendsCache = [];
let toastTimer = null;
let wheelAngle = 0;
let spinning = false;
let viewer = null;

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
  renderFriends();
  drawWheel();
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

function showToast(text, onAccept) {
  const toast = el("toast");
  el("toast-text").textContent = text;
  if (onAccept) {
    el("toast-accept").classList.remove("hidden");
    el("toast-decline").classList.remove("hidden");
    el("toast-accept").onclick = function () {
      hideToast();
      onAccept();
    };
    el("toast-decline").onclick = hideToast;
  } else {
    el("toast-accept").classList.add("hidden");
    el("toast-decline").classList.add("hidden");
  }
  toast.classList.remove("hidden");
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(hideToast, 15000);
}

function hideToast() {
  el("toast").classList.add("hidden");
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

function renderProfileChip() {
  const profile = getProfile();
  const chip = el("profile-chip");
  if (profile !== null) {
    el("chip-head").src = portraitDataUrl(profile.skin, 128);
    el("chip-pseudo").textContent = profile.pseudo;
    el("chip-elo").textContent = t(eloTitleKey(profile.elo));
  } else {
    el("chip-head").src = portraitDataUrl("drifter", 128);
    el("chip-pseudo").textContent = localPseudo();
    el("chip-elo").textContent = "";
  }
  chip.classList.remove("hidden");
  refreshCoins();
}

function refreshCoins() {
  const profile = getProfile();
  const badge = el("coins-badge");
  if (profile === null || activeDuel !== null) {
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

function invItem(iconUrl, name, equipped, locked, onClick) {
  const item = document.createElement("div");
  item.className = "inv-item";
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
    }));
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
    }));
  }
  const accRow = el("inv-acc");
  accRow.innerHTML = "";
  const equipped = equippedAccList();
  for (const acc of ACCESSORIES) {
    const isOwned = ownedAcc.has(acc.id);
    const isEquipped = equipped.indexOf(acc.id) !== -1;
    accRow.appendChild(invItem(accessoryIconDataUrl(acc.id, 88), t(acc.nameKey), isEquipped, !isOwned, async function () {
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
    }));
  }
}

async function openProfile() {
  bootAudio();
  const profile = await accountReady();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  el("profile-name").textContent = profile.pseudo;
  renderStatsBlock();
  ui.showScreen("screen-profile");
  mountViewer("profile-view");
  refreshViewerModel();
}

function openInventory() {
  renderInventory();
  ui.showScreen("screen-inventory");
  mountViewer("inv-view");
  refreshViewerModel();
}

el("profile-chip").addEventListener("click", openProfile);
el("btn-customize").addEventListener("click", openInventory);
el("btn-inv-back").addEventListener("click", function () {
  ui.showScreen("screen-profile");
  mountViewer("profile-view");
});

el("btn-profile-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
});

const wheelItems = [];
for (const skin of SKINS) {
  if (skin.id !== "drifter") {
    wheelItems.push({ kind: "skin", ref: skin.id, nameKey: skin.nameKey, icon: portraitDataUrl(skin.id, 64) });
  }
}
for (const weapon of WEAPONS) {
  if (weapon.id !== "iron") {
    wheelItems.push({ kind: "weapon", ref: weapon.id, nameKey: weapon.nameKey, icon: weaponIconDataUrl(weapon.id, 64) });
  }
}
for (const acc of ACCESSORIES) {
  wheelItems.push({ kind: "accessory", ref: acc.id, nameKey: acc.nameKey, icon: accessoryIconDataUrl(acc.id, 64) });
}
const wheelImages = [];
let wheelImagesLoaded = 0;
for (const item of wheelItems) {
  const img = new Image();
  img.onload = function () {
    wheelImagesLoaded += 1;
    if (wheelImagesLoaded === wheelItems.length) {
      drawWheel();
    }
  };
  img.src = item.icon;
  wheelImages.push(img);
}

function drawWheel() {
  const canvas = el("wheel-canvas");
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 4;
  const seg = (Math.PI * 2) / wheelItems.length;
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < wheelItems.length; i++) {
    const start = i * seg;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, start + seg);
    ctx.closePath();
    if (i % 2 === 0) {
      ctx.fillStyle = "#3a2412";
    } else {
      ctx.fillStyle = "#241608";
    }
    if (wheelItems[i].kind === "skin") {
      if (i % 2 === 0) {
        ctx.fillStyle = "#4a2c10";
      } else {
        ctx.fillStyle = "#3a2008";
      }
    }
    ctx.fill();
    ctx.strokeStyle = "#7a4c15";
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = start + seg / 2;
    const ix = center + Math.cos(mid) * radius * 0.68;
    const iy = center + Math.sin(mid) * radius * 0.68;
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(mid + Math.PI / 2);
    ctx.drawImage(wheelImages[i], -20, -20, 40, 40);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(center, center, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#e8b64c";
  ctx.fill();
  ctx.strokeStyle = "#7a4c15";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function openShop() {
  bootAudio();
  accountReady().then(function (profile) {
    if (profile === null) {
      alert(t("connectError"));
      return;
    }
    refreshCoins();
    el("wheel-result").classList.add("hidden");
    drawWheel();
    ui.showScreen("screen-shop");
  });
}

el("btn-shop").addEventListener("click", openShop);

el("btn-shop-back").addEventListener("click", function () {
  ui.showScreen("screen-title");
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
  let index = 0;
  for (let i = 0; i < wheelItems.length; i++) {
    if (wheelItems[i].kind === result.kind && wheelItems[i].ref === result.ref) {
      index = i;
    }
  }
  const segDeg = 360 / wheelItems.length;
  const centerDeg = index * segDeg + segDeg / 2;
  const current = ((wheelAngle % 360) + 360) % 360;
  const targetMod = ((270 - centerDeg) % 360 + 360) % 360;
  let delta = targetMod - current;
  if (delta <= 0) {
    delta += 360;
  }
  wheelAngle += 4 * 360 + delta;
  el("wheel-canvas").style.transform = "rotate(" + wheelAngle + "deg)";
  audio.whoosh();
  setTimeout(function () {
    spinning = false;
    el("btn-spin").disabled = false;
    refreshCoins();
    let nameKey = "";
    for (const item of wheelItems) {
      if (item.kind === result.kind && item.ref === result.ref) {
        nameKey = item.nameKey;
      }
    }
    if (result.duplicate) {
      audio.coin();
      resultNode.textContent = t("wheelDup", { item: t(nameKey) });
    } else {
      audio.wheelWin();
      resultNode.textContent = t("wheelNew", { item: t(nameKey) });
    }
    resultNode.classList.remove("hidden");
  }, 3600);
});

el("btn-home-ad").addEventListener("click", function () {
  bootAudio();
  accountReady().then(function (profile) {
    if (profile === null) {
      return;
    }
    el("btn-home-ad").disabled = true;
    requestRewardedAd({
      onStart: adMuteOn,
      onFinish: function () {
        adMuteOff();
        el("btn-home-ad").disabled = false;
        claimAdReward().then(renderProfileChip);
      },
      onError: function () {
        adMuteOff();
        el("btn-home-ad").disabled = false;
        showToast(t("shopAdFail"), null);
      }
    });
  });
});

function initSocial() {
  const profile = getProfile();
  if (socialReady || profile === null) {
    return;
  }
  socialReady = true;
  goOnline(profile.id, function () {
    renderFriends();
    updatePlayersOnline();
  });
  listenChallenges(profile.id, onChallenge);
  refreshFriends();
  refreshChallenges();
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
      if (entry.elo !== null) {
        let stateText = t("offline");
        if (online) {
          stateText = t("online");
        }
        sub.textContent = t(eloTitleKey(entry.elo)) + " · " + stateText;
      } else {
        sub.textContent = t("offline");
      }
      const dot = document.createElement("span");
      dot.className = "dot";
      if (online) {
        dot.classList.add("on");
      }
      row.appendChild(dot);
      if (online) {
        row.appendChild(friendButton(t("friendsChallenge"), false, function () {
          challengeOnline(entry.profileId);
        }));
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
          refreshFriends();
        }));
        row.appendChild(friendButton("✕", true, async function () {
          await respondFriendRequest(entry.fid, false);
          refreshFriends();
        }));
      } else {
        row.appendChild(friendButton("✕", true, async function () {
          await removeFriend(entry.fid);
          refreshFriends();
        }));
      }
    } else {
      const online = isOnline(entry.id);
      let stateText = t("offline");
      if (online) {
        stateText = t("online");
      }
      sub.textContent = t(eloTitleKey(entry.elo)) + " · " + stateText;
      const dot = document.createElement("span");
      dot.className = "dot";
      if (online) {
        dot.classList.add("on");
      }
      row.appendChild(dot);
      const duelBtn = friendButton(t("friendsChallenge"), false, function () {
        challengeOnline(entry.id);
      });
      duelBtn.disabled = !online;
      row.appendChild(duelBtn);
      row.appendChild(friendButton("✕", true, async function () {
        await removeFriend(entry.fid);
        refreshFriends();
      }));
    }
    list.appendChild(row);
  }
}

el("btn-friend-add").addEventListener("click", async function () {
  bootAudio();
  const pseudo = el("friend-input").value.trim();
  if (pseudo.length < 3) {
    return;
  }
  const profile = await accountReady();
  if (profile === null) {
    setFriendsMsg(t("accountError"));
    return;
  }
  const result = await sendFriendRequest(pseudo);
  if (result.ok) {
    el("friend-input").value = "";
    setFriendsMsg(t("friendsSent"));
    refreshFriends();
  } else if (result.reason === "notfound") {
    setFriendsMsg(t("friendsNotFound"));
  } else if (result.reason === "already") {
    setFriendsMsg(t("friendsAlready"));
  } else {
    setFriendsMsg(t("accountError"));
  }
});

el("friends-toggle").addEventListener("click", function () {
  el("friends-bar").classList.toggle("open");
});

function challengeOnline(profileId) {
  const profile = getProfile();
  if (profile === null || activeDuel !== null || profileId === null) {
    return;
  }
  const code = makeFriendCode();
  sendChallenge(profileId, { code: code, from: profile.pseudo });
  openFriendRoom(code, true);
  el("search-title").textContent = t("challengeSent");
}

function inviteAnyFriend() {
  if (activeDuel !== null) {
    return;
  }
  openFriendRoom(makeFriendCode(), true);
}

function onChallenge(payload) {
  if (activeDuel !== null || friendRoom !== null) {
    return;
  }
  const from = String(payload.from).slice(0, 16);
  const code = payload.code;
  ui.showScreen("screen-title");
  showToast(t("challengeFrom", { name: from }), function () {
    accountReady().then(function () {
      openFriendRoom(code, false);
    });
  });
}

function backToMenu() {
  activeDuel = null;
  cowboy.reset();
  cowboy.setSkin(skinById("drifter").colors);
  cowboy.setAccessories([]);
  cowboy.setWeapon(weaponById("iron").colors);
  viewmodel.holster();
  arena.applyModifier({ id: "noon", sway: 0 }, 19);
  ui.hudVisible(false);
  music.setMode("menu");
  ui.showScreen("screen-title");
  renderProfileChip();
  requestMidgameAd({ onStart: adMuteOn, onDone: adMuteOff });
}

function duelProfile() {
  const profile = getProfile();
  if (profile === null) {
    return { id: null, pseudo: localPseudo(), skin: "drifter", acc: [], weapon: "iron", elo: 1000 };
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
      const reward = el("matchend-reward");
      if (reward === null) {
        return;
      }
      if (ranked) {
        let deltaStr = String(result.elo_delta);
        if (result.elo_delta >= 0) {
          deltaStr = "+" + result.elo_delta;
        }
        reward.innerHTML =
          '<div class="me-rank">' + t("mRank", { rank: result.elo, delta: deltaStr }) + "</div>" +
          "<div>+" + result.coins_delta + " 🪙</div>";
      } else {
        reward.textContent = "+" + result.coins_delta + " 🪙";
      }
      reward.classList.remove("hidden");
    });
  };
}

function startAiDuel(persona) {
  cowboy.setSkin(skinById("drifter").colors);
  cowboy.setAccessories([]);
  cowboy.setWeapon(weaponById("iron").colors);
  applyMyWeapon();
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
    onCombat: startCombatMusic,
    playerBody: playerBody,
    onExit: backToMenu
  });
  activeDuel.start();
  refreshCoins();
}

function startCombatMusic() {
  bootAudio();
  music.start();
  music.setMode("combat");
}

function startNetDuel(room, ranked, friendly) {
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
    playerBody: playerBody,
    onExit: backToMenu
  });
  activeDuel.start();
  refreshCoins();
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
  let myPid = null;
  const searchProfile = getProfile();
  if (searchProfile !== null) {
    myPid = searchProfile.id;
  }
  matchmaker = createMatchmaker(myPid);
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
  let roomPid = null;
  const roomProfile = getProfile();
  if (roomProfile !== null) {
    roomPid = roomProfile.id;
  }
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
  }, roomPid);
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
  const profile = await accountReady();
  if (profile === null) {
    alert(t("connectError"));
    return;
  }
  startSearch();
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
    reward.textContent = "+" + def.reward + " 🪙";
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
  }
  arena.renderer.render(arena.scene, arena.camera);
  updateViewer(dt);
}

async function boot() {
  await initSdk();
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
    el("chip-elo").textContent = "…";
    el("chip-head").src = portraitDataUrl("drifter", 128);
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
  el("profile-chip").classList.remove("loading");
  renderProfileChip();
  if (netAvailable()) {
    el("friends-bar").classList.remove("hidden");
    el("friends-toggle").classList.remove("hidden");
    el("challenges-bar").classList.remove("hidden");
    el("challenges-toggle").classList.remove("hidden");
    renderFriends();
    renderChallenges();
    initSocial();
  }
  loadingStop();
  el("boot-loading").classList.add("hidden");
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
  }
}

ui.showScreen("screen-title");
loop();
boot();
