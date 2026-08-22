import { createBase, loadScript } from "./none.js";

const SDK_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
const LOAD_TIMEOUT = 8000;

export function createPlatform() {
  return createCrazyGames();
}

export function createCrazyGames() {
  const api = createBase("crazygames");
  let sdk = null;
  let host = false;

  function call(fn) {
    if (sdk === null) {
      return;
    }
    try {
      fn(sdk);
    } catch (err) {}
  }

  function read(fn, fallback) {
    if (sdk === null) {
      return fallback;
    }
    try {
      const value = fn(sdk);
      return value === undefined ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  function userReady() {
    return sdk !== null && sdk.user !== undefined && sdk.user !== null && sdk.user.isUserAccountAvailable === true;
  }

  api.init = async function () {
    if (window.CrazyGames === undefined || window.CrazyGames === null) {
      try {
        await loadScript(SDK_URL, LOAD_TIMEOUT);
      } catch (err) {
        return;
      }
    }
    if (window.CrazyGames === undefined || window.CrazyGames === null || window.CrazyGames.SDK === undefined) {
      return;
    }
    sdk = window.CrazyGames.SDK;
    try {
      await sdk.init();
      host = sdk.environment === "crazygames";
    } catch (err) {
      sdk = null;
      host = false;
    }
  };

  api.isHost = function () {
    return host;
  };

  api.accountAvailable = function () {
    return userReady();
  };

  api.loadingStart = function () {
    call(function (s) {
      s.game.loadingStart();
    });
  };

  api.loadingStop = function () {
    call(function (s) {
      s.game.loadingStop();
    });
  };

  api.gameplayStart = function () {
    call(function (s) {
      s.game.gameplayStart();
    });
  };

  api.gameplayStop = function () {
    call(function (s) {
      s.game.gameplayStop();
    });
  };

  api.happyTime = function () {
    call(function (s) {
      s.game.happytime();
    });
  };

  api.reportProgress = function (percent) {
    call(function (s) {
      s.game.reportGameCompletedPercentage(percent);
    });
  };

  api.requestMidgameAd = function (hooks) {
    if (sdk === null) {
      hooks.onDone();
      return;
    }
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
  };

  api.requestRewardedAd = function (hooks) {
    if (sdk === null) {
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
  };

  api.getInviteParam = function (name) {
    const value = read(function (s) {
      return s.game.getInviteParam(name);
    }, null);
    if (value === undefined || value === null || value === "") {
      return null;
    }
    return String(value);
  };

  api.inviteLink = function (code) {
    return read(function (s) {
      return s.game.inviteLink({ roomId: code });
    }, null);
  };

  api.showInviteButton = function (code) {
    call(function (s) {
      s.game.showInviteButton({ roomId: code });
    });
  };

  api.hideInviteButton = function () {
    call(function (s) {
      s.game.hideInviteButton();
    });
  };

  api.updateRoom = function (roomId, isJoinable) {
    call(function (s) {
      s.game.updateRoom({ roomId: roomId, isJoinable: isJoinable });
    });
  };

  api.leftRoom = function () {
    call(function (s) {
      s.game.leftRoom();
    });
  };

  api.onRoomJoin = function (handler) {
    call(function (s) {
      s.game.addJoinRoomListener(handler);
    });
  };

  api.isInstantMultiplayer = function () {
    return read(function (s) {
      return s.game.isInstantMultiplayer === true;
    }, false);
  };

  api.locale = function () {
    const info = read(function (s) {
      return s.user.systemInfo;
    }, null);
    if (info !== null && info !== undefined && typeof info.locale === "string") {
      return info.locale;
    }
    return null;
  };

  api.audioMuted = function () {
    return read(function (s) {
      return s.game.settings.muteAudio === true;
    }, false);
  };

  api.onSettingsChange = function (handler) {
    call(function (s) {
      s.game.addSettingsChangeListener(handler);
    });
  };

  api.showAuthPrompt = async function () {
    if (!userReady()) {
      return;
    }
    try {
      await sdk.user.showAuthPrompt();
    } catch (err) {}
  };

  api.showAccountLink = async function () {
    if (!userReady()) {
      return false;
    }
    try {
      await sdk.user.showAccountLinkPrompt();
      return true;
    } catch (err) {
      return false;
    }
  };

  api.onAuthChange = function (handler) {
    call(function (s) {
      s.user.addAuthListener(handler);
    });
  };

  api.submitScore = function (value) {
    call(function (s) {
      s.user.submitScore({ score: value });
    });
  };

  api.userToken = async function () {
    if (!userReady()) {
      return null;
    }
    try {
      const token = await sdk.user.getUserToken();
      if (token === null || token === "") {
        return null;
      }
      return token;
    } catch (err) {
      return null;
    }
  };

  api.isAuthenticated = async function () {
    if (!userReady() || !host) {
      return false;
    }
    const token = await api.userToken();
    return token !== null;
  };

  api.getUser = async function () {
    if (!userReady()) {
      return null;
    }
    try {
      return await sdk.user.getUser();
    } catch (err) {
      return null;
    }
  };

  api.getFriends = async function () {
    if (!userReady()) {
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
  };

  api.dataGet = function (key) {
    return read(function (s) {
      return s.data.getItem(key);
    }, null);
  };

  api.dataSet = function (key, value) {
    call(function (s) {
      s.data.setItem(key, value);
    });
  };

  api.dataRemove = function (key) {
    call(function (s) {
      s.data.removeItem(key);
    });
  };

  return api;
}
