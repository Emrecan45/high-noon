import { createBase } from "./platform/none.js";
import { createPlatform } from "virtual:platform";

const MIDGAME_COOLDOWN = 90000;

let platform = createBase("none");
let local = false;
let lastMidgameAt = 0;
let accountLinkAsked = false;

export async function initSdk() {
  local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  platform = createPlatform();
  try {
    await platform.init();
  } catch (err) {}
}

export function platformName() {
  return platform.name;
}

export function isCrazyGames() {
  return platform.name === "crazygames" && (platform.isHost() || local);
}

export function isRealCrazyGames() {
  return platform.name === "crazygames" && platform.isHost();
}

export function adsAvailable() {
  return platform.isHost();
}

export function loadingStart() {
  platform.loadingStart();
}

export function loadingStop() {
  platform.loadingStop();
}

export function gameplayStart() {
  platform.gameplayStart();
}

export function gameplayStop() {
  platform.gameplayStop();
}

export function happyTime() {
  platform.happyTime();
}

export function reportProgress(percent) {
  platform.reportProgress(Math.max(0, Math.min(100, Math.round(percent))));
}

export function requestMidgameAd(hooks) {
  const now = Date.now();
  if (now - lastMidgameAt < MIDGAME_COOLDOWN) {
    hooks.onDone();
    return;
  }
  lastMidgameAt = now;
  platform.requestMidgameAd(hooks);
}

export function requestRewardedAd(hooks) {
  platform.requestRewardedAd(hooks);
}

export function getInviteParam(name) {
  return platform.getInviteParam(name);
}

export function inviteLink(code) {
  return platform.inviteLink(code);
}

export function showInviteButton(code) {
  platform.showInviteButton(code);
}

export function hideInviteButton() {
  platform.hideInviteButton();
}

export function updateCgRoom(roomId, isJoinable) {
  platform.updateRoom(roomId, isJoinable);
}

export function leftCgRoom() {
  platform.leftRoom();
}

export function onCgRoomJoin(handler) {
  platform.onRoomJoin(handler);
}

export function cgLocale() {
  return platform.locale();
}

export function isInstantMultiplayer() {
  return platform.isInstantMultiplayer();
}

export async function showCgAuthPrompt() {
  await platform.showAuthPrompt();
}

export function submitCgScore(score) {
  const value = Math.round(Number(score));
  if (!Number.isFinite(value)) {
    return;
  }
  platform.submitScore(value);
}

export async function showCgAccountLink() {
  return await platform.showAccountLink();
}

export async function maybeAccountLink() {
  if (accountLinkAsked || !isRealCrazyGames()) {
    return;
  }
  const authed = await isCgAuthenticated();
  if (authed) {
    return;
  }
  accountLinkAsked = true;
  await showCgAccountLink();
}

export function onCgAuthChange(handler) {
  platform.onAuthChange(handler);
}

export function cgAudioMuted() {
  return platform.audioMuted();
}

export function onCgSettingsChange(handler) {
  platform.onSettingsChange(handler);
}

export async function cgUserToken() {
  return await platform.userToken();
}

export async function isCgAuthenticated() {
  return await platform.isAuthenticated();
}

export async function getCgUser() {
  return await platform.getUser();
}

export async function getCgFriends() {
  return await platform.getFriends();
}

export function cgDataGet(key) {
  return platform.dataGet(key);
}

export function cgDataSet(key, value) {
  platform.dataSet(key, value);
}

export function cgDataRemove(key) {
  platform.dataRemove(key);
}
