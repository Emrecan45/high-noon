import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { randomSeed } from "./rng.js";

export function netAvailable() {
  return SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
}

let client = null;

export function getClient() {
  if (client === null) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 20 } }
    });
  }
  return client;
}

function metaPid(state, key) {
  const metas = state[key];
  if (metas && metas.length > 0 && typeof metas[0].pid === "string") {
    return metas[0].pid;
  }
  return null;
}

export function createMatchmaker(myProfileId, lobbyName) {
  const supabase = getClient();
  const myId = crypto.randomUUID();
  const lobbyTopic = lobbyName || "hn-lobby-ranked";
  let lobby = null;
  let cancelled = false;
  let pairing = false;

  function findPartner(state) {
    const myPid = metaPid(state, myId);
    const ids = [];
    for (const key of Object.keys(state)) {
      if (key === myId || myPid === null || metaPid(state, key) !== myPid) {
        ids.push(key);
      }
    }
    ids.sort();
    if (ids.length < 2) {
      return null;
    }
    const myIndex = ids.indexOf(myId);
    if (myIndex === -1) {
      return null;
    }
    const pairStart = myIndex - (myIndex % 2);
    if (pairStart + 1 >= ids.length) {
      return null;
    }
    if (ids[pairStart] === myId) {
      return { partner: ids[pairStart + 1], isHost: true };
    }
    return { partner: ids[pairStart], isHost: false };
  }

  function search(callbacks) {
    cancelled = false;
    pairing = false;
    lobby = supabase.channel(lobbyTopic, {
      config: { presence: { key: myId } }
    });
    lobby.on("presence", { event: "sync" }, function () {
      if (cancelled || pairing) {
        return;
      }
      const match = findPartner(lobby.presenceState());
      if (match !== null) {
        pairing = true;
        openRoom(match, callbacks);
      }
    });
    lobby.subscribe(function (status) {
      if (status === "SUBSCRIBED") {
        lobby.track({ at: Date.now(), pid: myProfileId });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        callbacks.onError();
      }
    });
  }

  function leaveLobby() {
    if (lobby !== null) {
      supabase.removeChannel(lobby);
      lobby = null;
    }
  }

  function openRoom(match, callbacks) {
    const pairKey = [myId, match.partner].sort().join("-");
    const roomName = "hn-room-" + pairKey;
    const room = supabase.channel(roomName, {
      config: {
        broadcast: { self: false },
        presence: { key: myId }
      }
    });

    let eventHandler = null;
    let pendingEvents = [];
    let leftHandler = function () {};
    let started = false;
    let seed = null;
    let helloTimer = null;

    if (match.isHost) {
      seed = randomSeed();
    }

    function tryStart() {
      if (started || seed === null) {
        return;
      }
      const present = Object.keys(room.presenceState());
      if (present.length >= 2) {
        started = true;
        clearTimeout(helloTimer);
        leaveLobby();
        callbacks.onMatched({
          seed: seed,
          isHost: match.isHost,
          send: function (type, payload) {
            room.send({
              type: "broadcast",
              event: "duel",
              payload: { kind: type, data: payload }
            });
          },
          close: function () {
            supabase.removeChannel(room);
          },
          onEvent: function (handler) {
            eventHandler = handler;
            const backlog = pendingEvents;
            pendingEvents = [];
            for (const evt of backlog) {
              handler(evt[0], evt[1]);
            }
          },
          onLeft: function (handler) {
            leftHandler = handler;
          },
          leave: function () {
            supabase.removeChannel(room);
          }
        });
      }
    }

    function sendSeed() {
      room.send({
        type: "broadcast",
        event: "duel",
        payload: { kind: "seed", data: { value: seed } }
      });
    }

    room.on("broadcast", { event: "duel" }, function (msg) {
      const kind = msg.payload.kind;
      const data = msg.payload.data;
      if (kind === "seed") {
        if (!match.isHost && seed === null) {
          seed = data.value;
          tryStart();
        }
        return;
      }
      if (kind === "need-seed") {
        if (match.isHost) {
          sendSeed();
        }
        return;
      }
      if (eventHandler === null) {
        pendingEvents.push([kind, data]);
      } else {
        eventHandler(kind, data);
      }
    });

    room.on("presence", { event: "sync" }, function () {
      if (match.isHost) {
        const present = Object.keys(room.presenceState());
        if (present.length >= 2 && !started) {
          sendSeed();
          tryStart();
        }
      } else {
        tryStart();
      }
      if (started) {
        const present = Object.keys(room.presenceState());
        if (present.length < 2) {
          leftHandler();
        }
      }
    });

    let seedAsker = null;
    room.subscribe(function (status) {
      if (status === "SUBSCRIBED") {
        room.track({ at: Date.now() });
        if (!match.isHost) {
          seedAsker = setInterval(function () {
            if (seed !== null || started || cancelled) {
              clearInterval(seedAsker);
              return;
            }
            room.send({
              type: "broadcast",
              event: "duel",
              payload: { kind: "need-seed", data: {} }
            });
          }, 700);
        }
      }
    });

    helloTimer = setTimeout(function () {
      if (!started) {
        if (seedAsker !== null) {
          clearInterval(seedAsker);
        }
        supabase.removeChannel(room);
        pairing = false;
        if (!cancelled) {
          callbacks.onPairFailed();
        }
      }
    }, 6000);
  }

  function cancel() {
    cancelled = true;
    leaveLobby();
  }

  return {
    search: search,
    cancel: cancel
  };
}

let onlineChannel = null;
let onlineIds = new Set();
let onlineStates = new Map();
let onlineHandler = function () {};
let personalChannel = null;

export function goOnline(profileId, onSync, onFriendUpdate) {
  if (onlineChannel !== null) {
    return;
  }
  const supabase = getClient();
  onlineHandler = onSync;
  onlineChannel = supabase.channel("hn-online", {
    config: { presence: { key: profileId } }
  });
  onlineChannel.on("presence", { event: "sync" }, function () {
    const state = onlineChannel.presenceState();
    onlineIds = new Set(Object.keys(state));
    onlineStates = new Map();
    for (const id of Object.keys(state)) {
      const metas = state[id];
      const meta = metas && metas.length > 0 ? metas[0] : null;
      onlineStates.set(id, meta && typeof meta.state === "string" ? meta.state : "menu");
    }
    onlineHandler();
  });
  onlineChannel.subscribe(function (status) {
    if (status === "SUBSCRIBED") {
      onlineChannel.track({ at: Date.now(), state: "menu" });
    }
  });

  if (onFriendUpdate) {
    supabase.channel("hn-friends-" + profileId)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `requester=eq.${profileId}` }, function () {
        onFriendUpdate();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `addressee=eq.${profileId}` }, function () {
        onFriendUpdate();
      })
      .subscribe();
  }
}

export function isOnline(profileId) {
  return onlineIds.has(profileId);
}

export function onlineState(profileId) {
  if (!onlineStates.has(profileId)) {
    return null;
  }
  return onlineStates.get(profileId);
}

export function setOnlineState(state) {
  if (onlineChannel === null) {
    return;
  }
  onlineChannel.track({ at: Date.now(), state: state });
}

export function onlineCount() {
  return onlineIds.size;
}

export function listenChallenges(profileId, handler, replyHandler, friendsHandler) {
  if (personalChannel !== null) {
    return;
  }
  const supabase = getClient();
  personalChannel = supabase.channel("hn-user-" + profileId);
  personalChannel.on("broadcast", { event: "challenge" }, function (msg) {
    handler(msg.payload);
  });
  if (replyHandler) {
    personalChannel.on("broadcast", { event: "challenge_reply" }, function (msg) {
      replyHandler(msg.payload);
    });
  }
  if (friendsHandler) {
    personalChannel.on("broadcast", { event: "friends" }, function () {
      friendsHandler();
    });
  }
  personalChannel.subscribe();
}

function sendToUser(profileId, event, payload) {
  const channel = getClient().channel("hn-user-" + profileId);
  channel.httpSend(event, payload).catch(function () {});
}

export function sendChallenge(profileId, payload) {
  sendToUser(profileId, "challenge", payload);
}

export function sendChallengeReply(profileId, payload) {
  sendToUser(profileId, "challenge_reply", payload);
}

export function notifyFriendsChange(profileId) {
  sendToUser(profileId, "friends", { at: Date.now() });
}

export function createPrivateRoom(code, callbacks, myProfileId) {
  const supabase = getClient();
  const myId = crypto.randomUUID();
  const room = supabase.channel("hn-priv-" + code, {
    config: {
      broadcast: { self: false },
      presence: { key: myId }
    }
  });

  let cancelled = false;
  let started = false;
  let isHost = false;
  let seed = null;
  let eventHandler = null;
  let pendingEvents = [];
  let leftHandler = function () {};
  let seedAsker = null;

  function stopSeedAsker() {
    if (seedAsker !== null) {
      clearInterval(seedAsker);
      seedAsker = null;
    }
  }

  function sendSeed() {
    room.send({
      type: "broadcast",
      event: "duel",
      payload: { kind: "seed", data: { value: seed } }
    });
  }

  function tryStart() {
    if (started || cancelled || seed === null) {
      return;
    }
    const present = Object.keys(room.presenceState());
    if (present.length < 2) {
      return;
    }
    started = true;
    stopSeedAsker();
    callbacks.onMatched({
      seed: seed,
      isHost: isHost,
      send: function (type, payload) {
        room.send({
          type: "broadcast",
          event: "duel",
          payload: { kind: type, data: payload }
        });
      },
      close: function () {
        supabase.removeChannel(room);
      },
      onEvent: function (handler) {
        eventHandler = handler;
        const backlog = pendingEvents;
        pendingEvents = [];
        for (const evt of backlog) {
          handler(evt[0], evt[1]);
        }
      },
      onLeft: function (handler) {
        leftHandler = handler;
      },
      leave: function () {
        supabase.removeChannel(room);
      }
    });
  }

  room.on("broadcast", { event: "duel" }, function (msg) {
    const kind = msg.payload.kind;
    const data = msg.payload.data;
    if (kind === "seed") {
      if (!isHost && seed === null) {
        seed = data.value;
        tryStart();
      }
      return;
    }
    if (kind === "need-seed") {
      if (isHost && seed !== null) {
        sendSeed();
      }
      return;
    }
    if (eventHandler === null) {
      pendingEvents.push([kind, data]);
    } else {
      eventHandler(kind, data);
    }
  });

  room.on("presence", { event: "sync" }, function () {
    if (cancelled) {
      return;
    }
    const state = room.presenceState();
    const ids = Object.keys(state).sort();
    if (started) {
      if (ids.length < 2) {
        leftHandler();
      }
      return;
    }
    if (ids.length < 2 || ids.indexOf(myId) === -1) {
      return;
    }
    const myPid = metaPid(state, myId);
    let partnerId = ids[1];
    if (ids[0] !== myId) {
      partnerId = ids[0];
    }
    if (myPid !== null && metaPid(state, partnerId) === myPid) {
      return;
    }
    isHost = ids[0] === myId;
    if (isHost) {
      if (seed === null) {
        seed = randomSeed();
      }
      sendSeed();
      tryStart();
    } else if (seed === null) {
      if (seedAsker === null) {
        seedAsker = setInterval(function () {
          if (seed !== null || started || cancelled) {
            stopSeedAsker();
            return;
          }
          room.send({
            type: "broadcast",
            event: "duel",
            payload: { kind: "need-seed", data: {} }
          });
        }, 700);
      }
    } else {
      tryStart();
    }
  });

  room.subscribe(function (status) {
    if (status === "SUBSCRIBED") {
      room.track({ at: Date.now(), pid: myProfileId });
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      if (!started && !cancelled) {
        callbacks.onError();
      }
    }
  });

  function cancel() {
    cancelled = true;
    stopSeedAsker();
    if (!started) {
      supabase.removeChannel(room);
    }
  }

  return {
    cancel: cancel
  };
}
