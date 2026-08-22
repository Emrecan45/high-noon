export function createBase(name) {
  return {
    name: name,
    init: function () {
      return Promise.resolve();
    },
    isHost: function () {
      return false;
    },
    accountAvailable: function () {
      return false;
    },
    authBrand: function () {
      return null;
    },
    authEndpoint: function () {
      return null;
    },
    rewardedAvailable: function () {
      return false;
    },
    loadingStart: function () {},
    loadingStop: function () {},
    gameplayStart: function () {},
    gameplayStop: function () {},
    happyTime: function () {},
    reportProgress: function () {},
    requestMidgameAd: function (hooks) {
      hooks.onDone();
    },
    requestRewardedAd: function (hooks) {
      hooks.onError();
    },
    getInviteParam: function () {
      return null;
    },
    inviteLink: function () {
      return null;
    },
    showInviteButton: function () {},
    hideInviteButton: function () {},
    updateRoom: function () {},
    leftRoom: function () {},
    onRoomJoin: function () {},
    isInstantMultiplayer: function () {
      return false;
    },
    locale: function () {
      return null;
    },
    audioMuted: function () {
      return false;
    },
    onSettingsChange: function () {},
    showAuthPrompt: function () {
      return Promise.resolve();
    },
    showAccountLink: function () {
      return Promise.resolve(false);
    },
    onAuthChange: function () {},
    submitScore: function () {},
    userToken: function () {
      return Promise.resolve(null);
    },
    isAuthenticated: function () {
      return Promise.resolve(false);
    },
    getUser: function () {
      return Promise.resolve(null);
    },
    getFriends: function () {
      return Promise.resolve(null);
    },
    dataGet: function () {
      return null;
    },
    dataSet: function () {},
    dataRemove: function () {}
  };
}

export function createNone() {
  return createBase("none");
}

export function createPlatform() {
  return createNone();
}

export function loadScript(src, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const existing = document.querySelector('script[data-platform-sdk="' + src + '"]');
    if (existing !== null) {
      resolve();
      return;
    }
    const node = document.createElement("script");
    node.src = src;
    node.async = true;
    node.setAttribute("data-platform-sdk", src);
    let settled = false;
    const timer = setTimeout(function () {
      if (!settled) {
        settled = true;
        reject(new Error("timeout"));
      }
    }, timeoutMs);
    node.addEventListener("load", function () {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    });
    node.addEventListener("error", function () {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error("load failed"));
      }
    });
    document.head.appendChild(node);
  });
}
