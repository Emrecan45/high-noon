import { createBase, loadScript } from "./none.js";

const SDK_URL = "https://cdn.y8.com/minimal-sdk/2-0/y8.min.js";
const LOAD_TIMEOUT = 8000;
const READY_TIMEOUT = 6000;
const REWARD_TIMEOUT = 20000;
const MIDGAME_TIMEOUT = 10000;
const BREAK_TIMEOUT = 300000;
const SCORE_TABLE = "prime";
const LOGO_URL = "https://www.google.com/s2/favicons?domain=y8.com&sz=64";
const BRAND = { label: "Y8", logo: LOGO_URL, color: "#ffffff", shade: "#f1f1f1", edge: "#111111", text: "#111111" };

export function createPlatform() {
  return createY8(import.meta.env.VITE_Y8_GAME_ID || "", import.meta.env.VITE_Y8_APP_ID || "");
}

export function createY8(gameId, appId) {
  const api = createBase("y8");
  let sdk = null;
  let ready = false;
  let locale = null;
  const authHandlers = [];

  function factory() {
    const global = window.y8;
    if (global === undefined || global === null || typeof global.sdk !== "function") {
      return null;
    }
    return global;
  }

  function waitForSdk() {
    return new Promise(function (resolve) {
      if (factory() !== null) {
        resolve();
        return;
      }
      const started = Date.now();
      const timer = setInterval(function () {
        if (factory() !== null || Date.now() - started > READY_TIMEOUT) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
    });
  }

  function currentUser() {
    if (sdk === null) {
      return null;
    }
    try {
      const value = sdk.getUser();
      return value === undefined ? null : value;
    } catch (err) {
      return null;
    }
  }

  function emitAuth() {
    const user = currentUser();
    for (const handler of authHandlers) {
      try {
        handler(user);
      } catch (err) {}
    }
  }

  api.init = async function () {
    if (gameId === "" && appId === "") {
      return;
    }
    try {
      await loadScript(SDK_URL, LOAD_TIMEOUT);
    } catch (err) {
      return;
    }
    await waitForSdk();
    const global = factory();
    if (global === null) {
      return;
    }
    const adConfig = gameId === "" ? null : {
      gameId: gameId,
      preloadAdBreaks: "on",
      sound: "on"
    };
    let starting = null;
    try {
      sdk = global.sdk();
      starting = sdk.init({ appId: appId, autoLogin: appId !== "" }, adConfig);
    } catch (err) {
      sdk = null;
      return;
    }
    ready = true;
    try {
      sdk.onAuth(function () {
        emitAuth();
      });
    } catch (err) {}
    try {
      await starting;
    } catch (err) {}
    try {
      locale = await sdk.getPlatformLocale();
    } catch (err) {}
  };

  api.isHost = function () {
    return ready;
  };

  api.rewardedAvailable = function () {
    return ready && gameId !== "";
  };

  api.accountAvailable = function () {
    return ready && appId !== "";
  };

  api.authBrand = function () {
    return BRAND;
  };

  api.authEndpoint = function () {
    return api.accountAvailable() ? "y8-auth" : null;
  };

  api.requestMidgameAd = function (hooks) {
    if (!api.rewardedAvailable()) {
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
    let opened = false;
    setTimeout(function () {
      if (!opened) {
        done();
      }
    }, MIDGAME_TIMEOUT);
    setTimeout(done, BREAK_TIMEOUT);
    try {
      sdk.showAd({
        type: "next",
        name: "midgame",
        beforeAd: function () {
          opened = true;
          if (hooks.onStart) {
            hooks.onStart();
          }
        },
        adDismissed: done,
        adBreakDone: done
      }).catch(done);
    } catch (err) {
      done();
    }
  };

  api.requestRewardedAd = function (hooks) {
    if (!api.rewardedAvailable()) {
      hooks.onError();
      return;
    }
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
    let opened = false;
    let granted = false;
    setTimeout(function () {
      if (!opened) {
        fail();
      }
    }, REWARD_TIMEOUT);
    setTimeout(fail, BREAK_TIMEOUT);
    try {
      sdk.showAd({
        type: "reward",
        name: "reward",
        beforeReward: function (showAd) {
          opened = true;
          showAd();
        },
        beforeAd: function () {
          opened = true;
          if (hooks.onStart) {
            hooks.onStart();
          }
        },
        adViewed: function () {
          granted = true;
        },
        adBreakDone: function (info) {
          if (granted || (info !== undefined && info !== null && info.breakStatus === "viewed")) {
            finish();
            return;
          }
          fail();
        }
      }).catch(fail);
    } catch (err) {
      fail();
    }
  };

  api.locale = function () {
    return locale;
  };

  api.showAuthPrompt = async function () {
    if (!api.accountAvailable()) {
      return;
    }
    try {
      await sdk.login();
    } catch (err) {}
    emitAuth();
  };

  api.onAuthChange = function (handler) {
    if (typeof handler !== "function") {
      return;
    }
    authHandlers.push(handler);
    if (currentUser() !== null) {
      try {
        handler(currentUser());
      } catch (err) {}
    }
  };

  api.isAuthenticated = async function () {
    return api.accountAvailable() && currentUser() !== null;
  };

  api.getUser = async function () {
    const user = currentUser();
    if (user === null) {
      return null;
    }
    return { username: user.nickname, pid: String(user.pid) };
  };

  api.userToken = async function () {
    if (sdk === null) {
      return null;
    }
    try {
      const token = sdk.getAccessToken();
      if (token === undefined || token === null || token === "") {
        return null;
      }
      return token;
    } catch (err) {
      return null;
    }
  };

  api.submitScore = function (value, season) {
    if (!api.accountAvailable() || currentUser() === null) {
      return;
    }
    function write(table) {
      return sdk.saveLeaderboardScore({ table: table, points: value });
    }
    const key = Math.round(Number(season));
    try {
      if (!Number.isFinite(key) || key <= 0) {
        write(SCORE_TABLE).catch(function () {});
        return;
      }
      write(SCORE_TABLE + "_s" + key).catch(function () {
        write(SCORE_TABLE).catch(function () {});
      });
    } catch (err) {}
  };

  return api;
}
