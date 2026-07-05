import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { randomSeed } from "./rng.js";

export function netAvailable() {
  return SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
}

let client = null;

function getClient() {
  if (client === null) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 20 } }
    });
  }
  return client;
}

export function createMatchmaker() {
  const supabase = getClient();
  const myId = crypto.randomUUID();
  let lobby = null;
  let cancelled = false;
  let pairing = false;

  function findPartner(state) {
    const ids = Object.keys(state).sort();
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
    lobby = supabase.channel("hn-lobby", {
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
        lobby.track({ at: Date.now() });
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
