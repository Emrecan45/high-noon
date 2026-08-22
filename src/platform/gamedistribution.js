import { createBase, loadScript } from "./none.js";

const SDK_URL = "https://html5.api.gamedistribution.com/main.min.js";
const LOAD_TIMEOUT = 8000;
const READY_TIMEOUT = 6000;
const REWARD_TIMEOUT = 60000;

export function createPlatform() {
  return createGameDistribution(import.meta.env.VITE_GD_GAME_ID || "");
}

export function createGameDistribution(gameId) {
  const api = createBase("gamedistribution");
  let ready = false;
  let muted = false;
  let rewardWatched = false;
  const settingsHandlers = [];

  function emitSettings() {
    for (const handler of settingsHandlers) {
      try {
        handler({ muteAudio: muted });
      } catch (err) {}
    }
  }

  function setMuted(value) {
    if (muted === value) {
      return;
    }
    muted = value;
    emitSettings();
  }

  function onEvent(event) {
    if (event === null || event === undefined) {
      return;
    }
    if (event.name === "SDK_GAME_PAUSE") {
      setMuted(true);
      return;
    }
    if (event.name === "SDK_GAME_START") {
      setMuted(false);
      return;
    }
    if (event.name === "SDK_REWARDED_WATCH_COMPLETE") {
      rewardWatched = true;
    }
  }

  function sdk() {
    const instance = window.gdsdk;
    if (instance === undefined || instance === null) {
      return null;
    }
    return instance;
  }

  function waitForSdk() {
    return new Promise(function (resolve) {
      if (sdk() !== null) {
        resolve();
        return;
      }
      const started = Date.now();
      const timer = setInterval(function () {
        if (sdk() !== null || Date.now() - started > READY_TIMEOUT) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
    });
  }

  api.init = async function () {
    if (typeof gameId !== "string" || gameId === "") {
      return;
    }
    window.GD_OPTIONS = {
      gameId: gameId,
      prefix: "hn__",
      advertisementSettings: {
        debug: false,
        autoplay: false
      },
      onEvent: onEvent
    };
    try {
      await loadScript(SDK_URL, LOAD_TIMEOUT);
    } catch (err) {
      return;
    }
    await waitForSdk();
    ready = sdk() !== null;
  };

  api.isHost = function () {
    return ready;
  };

  api.requestMidgameAd = function (hooks) {
    const instance = sdk();
    if (!ready || instance === null || typeof instance.showAd !== "function") {
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
      if (hooks.onStart) {
        hooks.onStart();
      }
      instance.showAd().then(done).catch(done);
    } catch (err) {
      done();
    }
  };

  api.requestRewardedAd = function (hooks) {
    const instance = sdk();
    if (!ready || instance === null || typeof instance.showAd !== "function") {
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
    setTimeout(fail, REWARD_TIMEOUT);
    rewardWatched = false;
    try {
      if (hooks.onStart) {
        hooks.onStart();
      }
      instance.showAd("rewarded").then(function () {
        if (rewardWatched) {
          finish();
        } else {
          fail();
        }
      }).catch(fail);
    } catch (err) {
      fail();
    }
  };

  api.audioMuted = function () {
    return muted;
  };

  api.onSettingsChange = function (handler) {
    if (typeof handler === "function") {
      settingsHandlers.push(handler);
    }
  };

  api.preloadRewarded = function () {
    const instance = sdk();
    if (!ready || instance === null || typeof instance.preloadAd !== "function") {
      return;
    }
    try {
      instance.preloadAd("rewarded").catch(function () {});
    } catch (err) {}
  };

  return api;
}
