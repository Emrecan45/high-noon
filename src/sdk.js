let sdk = null;
let onCg = false;
let lastMidgameAt = 0;

const MIDGAME_COOLDOWN = 90000;

export async function initSdk() {
  if (window.CrazyGames && window.CrazyGames.SDK) {
    sdk = window.CrazyGames.SDK;
  }
  if (sdk === null) {
    return;
  }
  try {
    await sdk.init();
    onCg = sdk.environment === "crazygames";
  } catch (err) {
    sdk = null;
    onCg = false;
  }
}

export function isCrazyGames() {
  return onCg;
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
  try {
    sdk.ad.requestAd("rewarded", {
      adStarted: hooks.onStart,
      adFinished: hooks.onFinish,
      adError: hooks.onError
    });
  } catch (err) {
    hooks.onError();
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
