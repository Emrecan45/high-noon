let sdk = null;
let onCg = false;
let realCg = false;
let lastMidgameAt = 0;

const MIDGAME_COOLDOWN = 90000;

export async function initSdk() {
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (window.CrazyGames && window.CrazyGames.SDK) {
    sdk = window.CrazyGames.SDK;
  }
  if (sdk === null) {
    onCg = local;
    return;
  }
  try {
    await sdk.init();
    realCg = sdk.environment === "crazygames";
    onCg = realCg || local;
  } catch (err) {
    sdk = null;
    onCg = local;
  }
}

export function isCrazyGames() {
  return onCg;
}

export function isRealCrazyGames() {
  return realCg;
}

function call(fn) {
  if (sdk === null) {
    return;
  }
  try {
    fn(sdk);
  } catch (err) {}
}

export function loadingStart() {
  call(function (s) {
    s.game.loadingStart();
  });
}

export function loadingStop() {
  call(function (s) {
    s.game.loadingStop();
  });
}

export function gameplayStart() {
  call(function (s) {
    s.game.gameplayStart();
  });
}

export function gameplayStop() {
  call(function (s) {
    s.game.gameplayStop();
  });
}

export function happyTime() {
  call(function (s) {
    s.game.happytime();
  });
}

export function requestMidgameAd(hooks) {
  const now = Date.now();
  if (!onCg || now - lastMidgameAt < MIDGAME_COOLDOWN) {
    hooks.onDone();
    return;
  }
  lastMidgameAt = now;
  let finished = false;
  function done() {
    if (!finished) {
      finished = true;
      hooks.onDone();
    }
  }
  try {
    sdk.ad.requestAd("midgame", {
      adStarted: hooks.onStart,
      adFinished: done,
      adError: done
    });
  } catch (err) {
    done();
  }
}

export function requestRewardedAd(hooks) {
  if (!onCg) {
    hooks.onError();
    return;
  }
  let started = false;
  let settled = false;
  function finish() {
    if (!settled) {
      settled = true;
      hooks.onFinish();
    }
  }
  function fail() {
    if (!settled) {
      settled = true;
      hooks.onError();
    }
  }
  setTimeout(function () {
    if (!started) {
      fail();
    }
  }, 20000);
  try {
    sdk.ad.requestAd("rewarded", {
      adStarted: function () {
        started = true;
        if (hooks.onStart) {
          hooks.onStart();
        }
      },
      adFinished: finish,
      adError: fail
    });
  } catch (err) {
    fail();
  }
}

export function getInviteParam(name) {
  if (sdk === null) {
    return null;
  }
  try {
    const value = sdk.game.getInviteParam(name);
    if (value === undefined || value === null || value === "") {
      return null;
    }
    return String(value);
  } catch (err) {
    return null;
  }
}

export function inviteLink(code) {
  if (!onCg) {
    return null;
  }
  try {
    return sdk.game.inviteLink({ roomId: code });
  } catch (err) {
    return null;
  }
}

export function showInviteButton(code) {
  if (!onCg) {
    return;
  }
  call(function (s) {
    s.game.showInviteButton({ roomId: code });
  });
}

export function hideInviteButton() {
  if (!onCg) {
    return;
  }
  call(function (s) {
    s.game.hideInviteButton();
  });
}

export function updateCgRoom(roomId, isJoinable) {
  call(function (s) {
    s.game.updateRoom({ roomId: roomId, isJoinable: isJoinable });
  });
}

export function leftCgRoom() {
  call(function (s) {
    s.game.leftRoom();
  });
}

export function onCgRoomJoin(handler) {
  if (sdk === null) {
    return;
  }
  try {
    sdk.game.addJoinRoomListener(handler);
  } catch (err) {}
}

export function cgLocale() {
  if (sdk === null) {
    return null;
  }
  try {
    const info = sdk.user.systemInfo;
    if (info !== null && info !== undefined && typeof info.locale === "string") {
      return info.locale;
    }
  } catch (err) {}
  return null;
}

export function isInstantMultiplayer() {
  if (sdk === null) {
    return false;
  }
  try {
    return sdk.game.isInstantMultiplayer === true;
  } catch (err) {
    return false;
  }
}

export async function showCgAuthPrompt() {
  if (!onCg || !sdk.user.isUserAccountAvailable) {
    return;
  }
  try {
    await sdk.user.showAuthPrompt();
  } catch (err) {}
}

export function submitCgScore(score) {
  if (!onCg) {
    return;
  }
  const value = Math.round(Number(score));
  if (!Number.isFinite(value)) {
    return;
  }
  try {
    sdk.user.submitScore({ score: value });
  } catch (err) {}
}

export async function showCgAccountLink() {
  if (!onCg || sdk === null || !sdk.user.isUserAccountAvailable) {
    return false;
  }
  try {
    await sdk.user.showAccountLinkPrompt();
    return true;
  } catch (err) {
    return false;
  }
}

let accountLinkAsked = false;

export async function maybeAccountLink() {
  if (accountLinkAsked || !realCg) {
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
  if (sdk === null) {
    return;
  }
  try {
    sdk.user.addAuthListener(handler);
  } catch (err) {}
}

export function cgAudioMuted() {
  if (sdk === null) {
    return false;
  }
  try {
    return sdk.game.settings.muteAudio === true;
  } catch (err) {
    return false;
  }
}

export function onCgSettingsChange(handler) {
  if (sdk === null) {
    return;
  }
  try {
    sdk.game.addSettingsChangeListener(handler);
  } catch (err) {}
}

export function reportProgress(percent) {
  call(function (s) {
    s.game.reportGameCompletedPercentage(Math.max(0, Math.min(100, Math.round(percent))));
  });
}

export async function isCgAuthenticated() {
  if (!onCg || !sdk.user.isUserAccountAvailable) {
    return false;
  }
  if (!isRealCrazyGames()) {
    return false;
  }
  try {
    const token = await sdk.user.getUserToken();
    return token !== null && token !== "";
  } catch (err) {
    return false;
  }
}

export async function getCgUser() {
  if (!onCg || !sdk.user.isUserAccountAvailable) {
    return null;
  }
  try {
    return await sdk.user.getUser();
  } catch (err) {
    return null;
  }
}

export async function getCgFriends() {
  if (!onCg || !sdk.user.isUserAccountAvailable) {
    return null;
  }
  try {
    const result = await sdk.user.listFriends({ page: 0, size: 50 });
    if (result && Array.isArray(result.data)) {
      return result.data;
    }
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  } catch (err) {
    return null;
  }
}

export function cgDataGet(key) {
  if (sdk === null) {
    return null;
  }
  try {
    return sdk.data.getItem(key);
  } catch (err) {
    return null;
  }
}

export function cgDataSet(key, value) {
  call(function (s) {
    s.data.setItem(key, value);
  });
}

export function cgDataRemove(key) {
  call(function (s) {
    s.data.removeItem(key);
  });
}
