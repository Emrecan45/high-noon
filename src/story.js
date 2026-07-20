import { PERSONAS, TRAINING_PERSONA, STORY_PERSONAS } from "./ai.js";
import { skinById, aiSkinFor } from "./skins.js";
import { cgDataGet, cgDataSet, reportProgress } from "./sdk.js";

export const STORY_PERSONA_BY_ID = {
  nervous: PERSONAS[0],
  rapido: PERSONAS[1],
  patient: PERSONAS[2],
  grace: STORY_PERSONAS.grace,
  undertaker: STORY_PERSONAS.undertaker,
  training: TRAINING_PERSONA
};

export const CHAPTERS = [
  {
    id: "stranger",
    icon: "🤠",
    nameKey: "st.ch1.name",
    descKey: "st.ch1.desc",
    steps: [
      { type: "cine", script: "ch1_intro" },
      { type: "duel", persona: "nervous", modifier: "noon", loseScript: "ch1_lose" },
      { type: "cine", script: "ch1_win" }
    ]
  },
  {
    id: "raid",
    icon: "🐎",
    nameKey: "st.ch2.name",
    descKey: "st.ch2.desc",
    steps: [
      { type: "cine", script: "ch2_intro" },
      { type: "minigame", mode: "town", loseScript: "ch2_lose" },
      { type: "cine", script: "ch2_win" }
    ]
  },
  {
    id: "gusts",
    icon: "🌵",
    nameKey: "st.ch3.name",
    descKey: "st.ch3.desc",
    steps: [
      { type: "cine", script: "ch3_intro" },
      { type: "duel", persona: "rapido", modifier: "wind", loseScript: "ch3_lose" },
      { type: "cine", script: "ch3_win" }
    ]
  },
  {
    id: "heist",
    icon: "💰",
    nameKey: "st.ch4.name",
    descKey: "st.ch4.desc",
    steps: [
      { type: "cine", script: "ch4_intro" },
      { type: "minigame", mode: "bank", loseScript: "ch4_lose", loseScriptHostage: "ch4_lose_hostage" },
      { type: "cine", script: "ch4_win" }
    ]
  },
  {
    id: "betrayal",
    icon: "🥃",
    nameKey: "st.ch5.name",
    descKey: "st.ch5.desc",
    steps: [
      { type: "cine", script: "ch5_intro" },
      { type: "duel", persona: "patient", modifier: "dusk", loseScript: "ch5_lose" },
      { type: "cine", script: "ch5_win" }
    ]
  },
  {
    id: "boothill",
    icon: "⚰️",
    nameKey: "st.ch6.name",
    descKey: "st.ch6.desc",
    steps: [
      { type: "cine", script: "ch6_intro" },
      { type: "duel", persona: "grace", modifier: "fog", loseScript: "ch6_grace_lose" },
      { type: "cine", script: "ch6_mid" },
      { type: "duel", persona: "undertaker", modifier: "dusk", perks: ["eye"], loseScript: "ch6_boss_lose" },
      { type: "cine", script: "ch6_win" }
    ]
  }
];

const OPP_SPOT = { close: -5, medium: -12, far: -28 };
const YOU_SPOT = 6.4;

function cast(ctx, list) {
  const actors = { you: { colors: ctx.you.colors, outfit: ctx.you.outfit, acc: ctx.you.acc, weapon: ctx.you.weapon, name: ctx.you.name } };
  for (const id of list) {
    if (id === "sheriff") {
      actors.sheriff = { colors: skinById("sheriff").colors, outfit: skinById("sheriff").outfit, acc: ["star", "mustache", "sheriffpin"], weapon: "silver", name: "Pat Garrett" };
    } else if (id === "barman") {
      actors.barman = { colors: { skin: 0xd9a06b, shirt: 0xe8e0cf, pants: 0x3a2a18, hat: 0x6b4a26, bandana: 0x8a2f1d }, acc: ["beard"], weapon: "iron", name: "Jeremiah" };
    } else if (id === "clerk") {
      actors.clerk = { colors: { skin: 0xe0b287, shirt: 0x8a4a5c, pants: 0x2c2418, hat: 0x5a4020, bandana: 0xd8b13c }, acc: ["longhair"], weapon: "iron", name: "Mary", unarmed: true };
    } else if (id === "bandit") {
      actors.bandit = { colors: { skin: 0xb5825a, shirt: 0x23211f, pants: 0x1c1a18, hat: 0x141210, bandana: 0xb3271e }, outfit: { kind: "crossstrap", c1: 0x35230f, c2: 0xd8b13c }, acc: ["eyepatch"], weapon: "iron", name: "?", leftHanded: true };
    } else if (id === "bandit2") {
      actors.bandit2 = { colors: { skin: 0xc98b5e, shirt: 0x2c2418, pants: 0x23211f, hat: 0x141210, bandana: 0xb3271e }, outfit: { kind: "crossstrap", c1: 0x35230f, c2: 0xd8b13c }, acc: ["eyepatch"], weapon: "iron", name: "?" };
    } else if (id === "bandit3") {
      actors.bandit3 = { colors: { skin: 0xb5825a, shirt: 0x1c1a18, pants: 0x2c2418, hat: 0x141210, bandana: 0xb3271e }, outfit: { kind: "crossstrap", c1: 0x35230f, c2: 0xd8b13c }, acc: ["eyepatch"], weapon: "iron", name: "?" };
    } else if (id === "client1") {
      actors.client1 = { colors: { skin: 0xd9a06b, shirt: 0x8a6a3c, pants: 0x3a2a18, hat: 0x5a4020, bandana: 0x2e6b4f }, acc: [], weapon: "iron", name: "Client", unarmed: true };
    } else if (id === "client2") {
      actors.client2 = { colors: { skin: 0xc98b5e, shirt: 0x5c6e3a, pants: 0x2c2418, hat: 0x4a3018, bandana: 0x3b5998 }, acc: [], weapon: "iron", name: "Client", unarmed: true };
    } else {
      const skin = aiSkinFor(id);
      actors[id] = { colors: skin.colors, outfit: skin.outfit || null, acc: skin.acc, weapon: skin.weapon, name: STORY_PERSONA_BY_ID[id].name };
    }
  }
  return actors;
}

export const SCRIPTS = {
  ch1_intro: function (ctx) {
    return {
      actors: cast(ctx, ["nervous", "barman"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "noon", music: "town", place: [{ actor: "you", at: [0.6, 0, 14], ry: Math.PI }], cut: { pos: [3.4, 2.6, 17], look: [0.4, 1.2, 8] }, dur: 0.2 },
        { fade: "in", dur: 0.8 },
        { say: { actor: "you", key: "st1n1" } },
        { walk: [{ actor: "you", to: [0.6, 0, 5] }], cam: { pos: [2.8, 1.7, 9.5], look: [0.6, 1.3, 2] }, dur: 4.2 },
        { say: { actor: "you", key: "st1n2" } },
        { cam: { pos: [1.8, 1.8, 0.4], look: [7.4, 1.6, -2.4] }, walk: [{ actor: "you", to: [4.6, 0, -2], endRy: Math.PI / 2 }], dur: 3.4 },
        { fade: "out", dur: 0.5 },
        { show: "saloon", music: "saloon2", place: [
          { actor: "you", at: { set: "saloon", at: [0, 0, 3.2] }, face: { set: "saloon", at: [-2.4, 0, -0.4] } },
          { actor: "nervous", at: { set: "saloon", at: [3.05, 0, 1.6] }, ry: -Math.PI / 2, seated: true },
          { actor: "barman", at: { set: "saloon", at: [-4.15, 0, -0.7] }, ry: Math.PI / 2 }
        ], cut: { pos: { set: "saloon", at: [-0.5, 1.8, -2.6] }, look: { set: "saloon", at: [0, 1.2, 3.2] } }, dur: 0.3 },
        { fade: "in", doors: "open", sfx: "doorCreak", dur: 0.6 },
        { walk: [{ actor: "you", to: { set: "saloon", at: [-2.4, 0, -0.4] }, endFace: { set: "saloon", at: [-4.15, 0, -0.7] } }], cam: { pos: { set: "saloon", at: [2.2, 1.75, 1.8] }, look: { set: "saloon", at: [-3, 1.1, -0.8] } }, dur: 3.2 },
        { doors: "close", dur: 0.1 },
        { say: { actor: "barman", key: "st1i1" }, cut: { pos: { set: "saloon", at: [-1.6, 1.55, 0.9] }, look: { set: "saloon", at: [-4.2, 1.35, -0.9] } } },
        { say: { actor: "you", key: "st1i2" }, cut: { pos: { set: "saloon", at: [-3.9, 1.6, -1.6] }, look: { set: "saloon", at: [-2.2, 1.3, 0] } } },
        { say: { actor: "barman", key: "st1i3" }, cut: { pos: { set: "saloon", at: [-1.6, 1.55, 0.9] }, look: { set: "saloon", at: [-4.2, 1.35, -0.9] } } },
        { music: "standoff", sfx: "glassHit", dur: 0.8 },
        { place: [{ actor: "nervous", at: { set: "saloon", at: [3.05, 0, 1.6] }, ry: -Math.PI / 2, seated: true }], cut: { pos: { set: "saloon", at: [1.3, 1.42, 0.55] }, look: { set: "saloon", at: [3.05, 1.02, 1.62] }, fov: 52 }, dur: 0.6 },
        { say: { actor: "nervous", key: "st1i4" } },
        { pose: [{ actor: "nervous", seated: false }], dur: 0.4 },
        { walk: [{ actor: "nervous", to: { set: "saloon", at: [3.05, 0, 0.4] } }], cam: { pos: { set: "saloon", at: [-0.4, 1.65, 1.9] }, look: { set: "saloon", at: [1.5, 1.25, 0.4] } }, dur: 1.0 },
        { walk: [{ actor: "nervous", to: { set: "saloon", at: [-1.2, 0, -0.2] }, endFace: "you" }], cam: { pos: { set: "saloon", at: [-0.4, 1.65, 1.9] }, look: { set: "saloon", at: [-1.4, 1.25, -0.4] } }, dur: 1.2 },
        { say: { actor: "nervous", key: "st1i5" } },
        { pose: [{ actor: "you", face: "nervous" }], say: { actor: "you", key: "st1i6" }, cut: { pos: { set: "saloon", at: [-1.1, 1.6, -1.9] }, look: { set: "saloon", at: [-2.2, 1.35, -0.2] } } },
        { say: { actor: "barman", key: "st1i7" }, cut: { pos: { set: "saloon", at: [-1.6, 1.55, 0.9] }, look: { set: "saloon", at: [-4.2, 1.35, -0.9] } } },
        { say: { actor: "nervous", key: "st1i8" }, cut: { pos: { set: "saloon", at: [-2.6, 1.5, -1.6] }, look: { set: "saloon", at: [-1.1, 1.35, -0.1] }, fov: 55 } },
        { say: { actor: "nervous", key: "st1n3", silent: true } }
      ]
    };
  },
  ch1_lose: function (ctx) {
    return {
      actors: cast(ctx, ["nervous", "barman"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "noon", place: [
          { actor: "you", at: [0.4, 0, YOU_SPOT], seated: "hostage", face: "nervous" },
          { actor: "nervous", at: [0.5, 0, 4.6], face: "you" },
          { actor: "barman", at: [2.8, 0, 2.2], face: "you" }
        ], pose: [{ actor: "you", wounded: true }], cut: { pos: [-1.6, 1.5, 8.6], look: [0.5, 1, 5.2] }, dur: 0.2 },
        { fade: "in", dur: 0.7 },
        { say: { actor: "nervous", key: "st1l1" } },
        { walk: [{ actor: "barman", to: [1.4, 0, 5.6], endFace: "you" }], dur: 1.6 },
        { say: { actor: "barman", key: "st1l2" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch1_win: function (ctx) {
    return {
      actors: cast(ctx, ["nervous", "sheriff"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "noon", music: "town", place: [
          { actor: "you", at: [0.4, 0, OPP_SPOT.close + 2], face: "nervous" },
          { actor: "nervous", at: [0.6, 0, OPP_SPOT.close], seated: "hostage", face: "you" }
        ], pose: [{ actor: "nervous", wounded: true }], cut: { pos: [2.6, 1.7, -2.4], look: [0.5, 1, -4.6] }, dur: 0.2 },
        { fade: "in", dur: 0.7 },
        { say: { actor: "nervous", key: "st1w1" } },
        { place: [{ actor: "sheriff", at: [-2, 0, 3], face: "you" }], walk: [{ actor: "sheriff", to: [-0.6, 0, -3.4], endFace: "nervous" }], cam: { pos: [-1.8, 1.2, -6.8], look: [-0.2, 1.3, -3.6] }, dur: 3 },
        { pose: [{ actor: "sheriff", face: "you" }], say: { actor: "sheriff", key: "st1w2" } },
        { say: { actor: "you", key: "st1w3", silent: true }, cam: { pos: [0.4, 2.6, 2], look: [0.4, 1.4, -7], fov: 62 }, dur: 2.4 },
        { fade: "out", dur: 0.8 }
      ]
    };
  },

  ch2_intro: function (ctx) {
    return {
      actors: cast(ctx, ["sheriff"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "sheriff", music: "mission", place: [
          { actor: "sheriff", at: { set: "sheriff", at: [-0.4, 0, -1.6] }, ry: 0, seated: true },
          { actor: "you", at: { set: "sheriff", at: [-0.4, 0, 0.9] }, ry: Math.PI }
        ], cut: { pos: { set: "sheriff", at: [1.6, 1.7, 1.7] }, look: { set: "sheriff", at: [-0.8, 1.1, -1.2] } }, dur: 0.2 },
        { fade: "in", dur: 0.7 },
        { say: { actor: "sheriff", key: "st2i1" } },
        { say: { actor: "you", key: "st2i2" }, cut: { pos: { set: "sheriff", at: [-1.9, 1.6, -1.4] }, look: { set: "sheriff", at: [-0.3, 1.3, 0.9] } } },
        { say: { actor: "sheriff", key: "st2i3" }, cut: { pos: { set: "sheriff", at: [0.9, 1.5, -0.1] }, look: { set: "sheriff", at: [-0.6, 1.25, -1.7] } } },
        { pose: [{ actor: "sheriff", seated: false }], dur: 0.3 },
        { walk: [{ actor: "sheriff", to: { set: "sheriff", at: [-2.4, 0, -2.2] }, endRy: Math.PI }], cam: { pos: { set: "sheriff", at: [-0.6, 1.7, 0.6] }, look: { set: "sheriff", at: [-2.6, 1.5, -2.2] } }, dur: 2.4 },
        { pose: [{ actor: "sheriff", face: "you" }], say: { actor: "sheriff", key: "st2i4" } },
        { say: { actor: "you", key: "st2i5" }, cut: { pos: { set: "sheriff", at: [-2.2, 1.6, -1.2] }, look: { set: "sheriff", at: [-0.4, 1.3, 0.9] } } },
        { say: { actor: "sheriff", key: "st2i6" }, cut: { pos: { set: "sheriff", at: [-1, 1.55, 0.3] }, look: { set: "sheriff", at: [-2.5, 1.35, -2.2] } } },
        { sfx: "coin", say: { actor: "sheriff", key: "st2i7" } },
        { say: { actor: "you", key: "st2n1", silent: true } }
      ]
    };
  },
  ch2_lose: function (ctx) {
    return {
      actors: cast(ctx, ["sheriff"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "sheriff", place: [
          { actor: "sheriff", at: { set: "sheriff", at: [-0.2, 0, -0.3] }, face: "you" },
          { actor: "you", at: { set: "sheriff", at: [-0.4, 0, 1.2] }, face: "sheriff" }
        ], cut: { pos: { set: "sheriff", at: [1.7, 1.65, 1.5] }, look: { set: "sheriff", at: [-0.6, 1.3, -0.4] } }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "sheriff", key: "st2l1" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch2_win: function (ctx) {
    return {
      actors: cast(ctx, ["sheriff", "rapido", "bandit", "bandit2", "bandit3"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "sheriff", music: "mission", place: [
          { actor: "sheriff", at: { set: "sheriff", at: [-0.4, 0, -1.6] }, ry: 0, seated: true },
          { actor: "you", at: { set: "sheriff", at: [-0.4, 0, 0.9] }, ry: Math.PI }
        ], cut: { pos: { set: "sheriff", at: [1.6, 1.7, 1.7] }, look: { set: "sheriff", at: [-0.8, 1.1, -1.2] } }, dur: 0.2 },
        { fade: "in", dur: 0.7 },
        { say: { actor: "sheriff", key: "st2w1" } },
        { fade: "out", dur: 0.6 },
        { hideSet: true, mod: "noon", music: "standoff", place: [
          { actor: "rapido", at: [0.6, 0, 3.2], ry: Math.PI },
          { actor: "bandit", at: [-1.4, 0, -2.6], ry: 0.7 },
          { actor: "bandit2", at: [2.1, 0, -5.6], ry: -1.1 },
          { actor: "bandit3", at: [-0.6, 0, -9], ry: 2.5 }
        ], pose: [
          { actor: "bandit", dead: true, rest: 0.2, settled: true },
          { actor: "bandit2", dead: true, rest: 0.2, fallDir: "left", settled: true },
          { actor: "bandit3", dead: true, rest: 0.2, settled: true }
        ], cut: { pos: [2.4, 2.0, 6.8], look: [0.2, 1.0, -6] }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "rapido", key: "st2w2", name: "?" } },
        { fade: "out", dur: 0.8 }
      ]
    };
  },

  ch3_intro: function (ctx) {
    return {
      actors: cast(ctx, ["rapido"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "wind", music: "standoff", place: [{ actor: "you", at: [0.6, 0, 8], ry: Math.PI }], cut: { pos: [-2.6, 2.2, 12], look: [0.8, 1.2, 8] }, dur: 0.2 },
        { fade: "in", dur: 0.8 },
        { say: { actor: "you", key: "st3n1", silent: true } },
        { walk: [{ actor: "you", to: [0.6, 0, 13] }], cam: { pos: [-2.2, 1.9, 16], look: [0.6, 1.25, 12] }, dur: 3.2 },
        { place: [{ actor: "rapido", at: [0.6, 0, 17.5], face: "you" }], cut: { pos: [1.9, 1.55, 13.4], look: [0.6, 1.3, 17.5], fov: 58 }, dur: 0.7 },
        { say: { actor: "rapido", key: "st3i1" } },
        { pose: [{ actor: "you", face: "rapido" }], say: { actor: "you", key: "st3i2" }, cut: { pos: [-0.8, 1.6, 16.6], look: [0.6, 1.3, 13.2] } },
        { walk: [{ actor: "rapido", to: [0.6, 0, 14.8], endFace: "you" }], cam: { pos: [2.2, 1.5, 13.8], look: [0.6, 1.35, 14.8], fov: 52 }, dur: 2.2 },
        { say: { actor: "rapido", key: "st3i3" } },
        { say: { actor: "rapido", key: "st3i4" }, cut: { pos: [0.6, 1.5, 13.4], look: [0.6, 1.55, 14.6], fov: 46 } },
        { say: { actor: "rapido", key: "st3n2", silent: true } }
      ]
    };
  },
  ch3_lose: function (ctx) {
    return {
      actors: cast(ctx, ["rapido"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "wind", place: [
          { actor: "you", at: [0.4, 0, YOU_SPOT], seated: "hostage", face: "rapido" },
          { actor: "rapido", at: [0.5, 0, 4.6], face: "you" }
        ], pose: [{ actor: "you", wounded: true }], cut: { pos: [-1.6, 1.5, 8.6], look: [0.5, 1, 5.2] }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "rapido", key: "st3l1" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch3_win: function (ctx) {
    return {
      actors: cast(ctx, ["rapido"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "wind", music: "standoff", place: [
          { actor: "you", at: [0.4, 0, OPP_SPOT.close + 1.8], face: "rapido" },
          { actor: "rapido", at: [0.6, 0, OPP_SPOT.close], seated: "hostage", face: "you" }
        ], pose: [{ actor: "rapido", wounded: true }], cut: { pos: [2.4, 1.6, -2.6], look: [0.6, 1, -4.8] }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "rapido", key: "st3w1" } },
        { say: { actor: "you", key: "st3w2" }, cut: { pos: [-1.2, 1.65, -5.6], look: [0.6, 1.35, -3] } },
        { pose: [{ actor: "rapido", seated: false }], cut: { pos: [-1.4, 1.6, -2.6], look: [0.6, 1.3, -5] }, dur: 0.4 },
        { say: { actor: "rapido", key: "st3w3" } },
        { walk: [{ actor: "rapido", to: [4, 0, -16], speed: 2.2 }], cam: { pos: [-1.5, 1.8, -3.4], look: [3, 1.2, -12] }, dur: 2.6 },
        { fade: "out", dur: 0.8 }
      ]
    };
  },

  ch4_intro: function (ctx) {
    return {
      actors: cast(ctx, ["clerk", "bandit", "bandit2", "client1", "client2"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "bank", music: "mission", place: [
          { actor: "you", at: { set: "bank", at: [1.4, 0, -1.6] }, face: "clerk" },
          { actor: "clerk", at: { set: "bank", at: [-1.6, 0, -1.6] }, face: "you" },
          { actor: "client1", at: { set: "bank", at: [-4.3, 0, 0.9] }, ry: 1.25 },
          { actor: "client2", at: { set: "bank", at: [4.3, 0, 1.3] }, ry: -1.25 }
        ], pose: [{ actor: "you", holsterHand: true }], cut: { pos: { set: "bank", at: [3.2, 1.9, 2.9] }, look: { set: "bank", at: [-0.2, 1.1, -1] } }, dur: 0.2 },
        { fade: "in", dur: 0.7 },
        { say: { actor: "you", key: "st4n1", silent: true } },
        { say: { actor: "clerk", key: "st4i1" }, cut: { pos: { set: "bank", at: [0, 1.6, 1.2] }, look: { set: "bank", at: [0, 1.35, -1.1] } } },
        { say: { actor: "you", key: "st4i2" }, cut: { pos: { set: "bank", at: [-1.4, 1.6, -0.8] }, look: { set: "bank", at: [1.4, 1.3, -1.1] } } },
        { sfx: "bang", music: "standoff", dur: 0.5 },
        { pose: [{ actor: "clerk", face: { set: "bank", at: [0, 0, 3.4] } }], say: { actor: "clerk", key: "st4i5" }, cut: { pos: { set: "bank", at: [0.6, 1.65, 0] }, look: { set: "bank", at: [-1.7, 1.35, -1.1] } } },
        { place: [
          { actor: "bandit", at: { set: "bank", at: [-0.5, 0, 3] }, face: "you" },
          { actor: "bandit2", at: { set: "bank", at: [0.7, 0, 3.2] }, face: "clerk" }
        ], pose: [{ actor: "bandit", draw: true }, { actor: "bandit2", draw: true }], cut: { pos: { set: "bank", at: [0, 1.55, 0.4] }, look: { set: "bank", at: [0, 1.3, 3.2] } }, dur: 0.7 },
        { say: { actor: "bandit", key: "st4i3" } },
        { pose: [{ actor: "you", draw: true, face: { set: "bank", at: [0.1, 0, 3.1] } }], cut: { pos: { set: "bank", at: [-1.7, 1.5, 2.6] }, look: { set: "bank", at: [1.2, 1.3, -0.8] }, fov: 56 }, dur: 0.5 },
        { say: { actor: "you", key: "st4i4" } },
        { say: { actor: "clerk", key: "st4n2", silent: true } }
      ]
    };
  },
  ch4_lose: function (ctx) {
    return {
      actors: cast(ctx, ["clerk", "client1", "client2"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "bank", place: [
          { actor: "you", at: { set: "bank", at: [1.4, 0, -1.6] }, face: "clerk" },
          { actor: "clerk", at: { set: "bank", at: [-1.2, 0, -1.1] }, face: "you" },
          { actor: "client1", at: { set: "bank", at: [-4.3, 0, 0.9] }, ry: 1.25 },
          { actor: "client2", at: { set: "bank", at: [4.3, 0, 1.3] }, ry: -1.25 }
        ], pose: [{ actor: "you", holsterHand: true }], cut: { pos: { set: "bank", at: [1.8, 1.7, 2.6] }, look: { set: "bank", at: [-0.2, 1.2, -0.6] } }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "clerk", key: "st4l1" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch4_lose_hostage: function (ctx) {
    return {
      actors: cast(ctx, ["clerk", "client1", "client2"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "bank", place: [
          { actor: "you", at: { set: "bank", at: [1.4, 0, -1.6] }, face: "clerk" },
          { actor: "clerk", at: { set: "bank", at: [-1.2, 0, -1.1] }, face: "you" },
          { actor: "client1", at: { set: "bank", at: [-4.3, 0, 0.9] }, ry: 1.25 },
          { actor: "client2", at: { set: "bank", at: [4.3, 0, 1.3] }, ry: -1.25 }
        ], pose: [{ actor: "you", holsterHand: true }], cut: { pos: { set: "bank", at: [1.8, 1.7, 2.6] }, look: { set: "bank", at: [-0.2, 1.2, -0.6] } }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "clerk", key: "st4lh1" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch4_win: function (ctx) {
    return {
      actors: cast(ctx, ["clerk", "patient", "client1", "client2"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "bank", music: "mission", place: [
          { actor: "you", at: { set: "bank", at: [1.4, 0, -1.6] }, face: "clerk" },
          { actor: "clerk", at: { set: "bank", at: [-1.6, 0, -1.6] }, ry: 0 },
          { actor: "client1", at: { set: "bank", at: [-4.3, 0, 0.9] }, ry: 1.25 },
          { actor: "client2", at: { set: "bank", at: [4.3, 0, 1.3] }, ry: -1.25 }
        ], pose: [{ actor: "you", holsterHand: true }], cut: { pos: { set: "bank", at: [2.6, 1.8, 3] }, look: { set: "bank", at: [-0.2, 1.15, -0.8] } }, dur: 0.2 },
        { fade: "in", dur: 0.7 },
        { say: { actor: "clerk", key: "st4w1" } },
        { place: [{ actor: "patient", at: { set: "bank", at: [0, 0, 3.4] }, face: "you" }], walk: [{ actor: "patient", to: { set: "bank", at: [0.2, 0, 2.4] }, endFace: "you" }], cam: { pos: { set: "bank", at: [-1.9, 1.65, 1.2] }, look: { set: "bank", at: [0.4, 1.3, 2.8] } }, dur: 2.2 },
        { pose: [{ actor: "you", face: "patient" }], say: { actor: "patient", key: "st4w2" } },
        { say: { actor: "you", key: "st4n3", silent: true }, cam: { pos: { set: "bank", at: [-2.4, 1.5, 0.4] }, look: { set: "bank", at: [0.3, 1.35, 2.5] }, fov: 56 }, dur: 2 },
        { fade: "out", dur: 0.8 }
      ]
    };
  },

  ch5_intro: function (ctx) {
    return {
      actors: cast(ctx, ["patient", "sheriff"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "dusk", music: "frontier", cut: { pos: [1.2, 1.7, 6], look: [4, 1.4, -8] }, dur: 0.2 },
        { fade: "in", dur: 0.7 },
        { say: { actor: "you", key: "st5n1", silent: true } },
        { fade: "out", dur: 0.5 },
        { show: "sheriff", place: [
          { actor: "sheriff", at: { set: "sheriff", at: [-0.4, 0, -1.6] }, face: { set: "sheriff", at: [-0.4, 0, -3.0] } },
          { actor: "patient", at: { set: "sheriff", at: [0.4, 0, 2.6] }, face: "sheriff" },
          { actor: "you", at: { set: "sheriff", at: [-0.4, 0, 1.2] }, face: "sheriff", hidden: true }
        ], cut: { pos: { set: "sheriff", at: [-2.2, 1.6, 1.9] }, look: { set: "sheriff", at: [-0.2, 1.2, -0.2] } }, dur: 0.3 },
        { fade: "in", dur: 0.7 },
        { walk: [{ actor: "patient", to: { set: "sheriff", at: [0.2, 0, 0.5] }, speed: 0.9, endFace: "sheriff" }], dur: 1.8 },
        { pose: [{ actor: "patient", draw: true }], dur: 0.5 },
        { sfx: "gunshot", pose: [{ actor: "patient", shoot: true }, { actor: "sheriff", flinch: true }], dur: 0.4 },
        { pose: [{ actor: "sheriff", dead: true, rest: 0.24, fallDir: "left"}, { actor: "patient", holster: true }], cam: { pos: { set: "sheriff", at: [-1.8, 1.4, 1.4] }, look: { set: "sheriff", at: [0.2, 0.7, 0.4] } }, dur: 1.4 },
        { place: [{ actor: "you", at: { set: "sheriff", at: [-0.4, 0, 1.2] }, face: "sheriff", hidden: false }], sfx: "doorCreak", cut: { pos: { set: "sheriff", at: [1.6, 1.65, 3] }, look: { set: "sheriff", at: [-0.1, 1.1, 0.4] } }, dur: 0.6 },
        { say: { actor: "you", key: "st5i1" } },
        { pose: [{ actor: "patient", face: "you" }], say: { actor: "patient", key: "st5i2" }, cut: { pos: { set: "sheriff", at: [-1.3, 1.6, 0.9] }, look: { set: "sheriff", at: [0.4, 1.3, 0.6] } } },
        { pose: [{ actor: "you", face: "patient" }], say: { actor: "you", key: "st5i3" }, cut: { pos: { set: "sheriff", at: [1.4, 1.55, 0.2] }, look: { set: "sheriff", at: [-0.3, 1.3, 1] } } },
        { sfx: "coin", say: { actor: "patient", key: "st5i4" }, cut: { pos: { set: "sheriff", at: [1.6, 1.5, 1.8] }, look: { set: "sheriff", at: [-0.1, 1.3, 1.3] }, fov: 58 } },
        { say: { actor: "patient", key: "st5i5" } },
        { walk: [{ actor: "patient", to: { set: "sheriff", at: [0, 0, 3.8] }, endFace: "you" }], cam: { pos: { set: "sheriff", at: [1.7, 1.65, 0.4] }, look: { set: "sheriff", at: [-0.4, 1.3, 1.8] } }, dur: 2.4 },
        { say: { actor: "patient", key: "st5i6" } },
        { say: { actor: "you", key: "st5n2", silent: true } }
      ]
    };
  },
  ch5_lose: function (ctx) {
    return {
      actors: cast(ctx, ["patient"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "dusk", place: [
          { actor: "you", at: [0.4, 0, YOU_SPOT], seated: "hostage", face: "patient" },
          { actor: "patient", at: [0.5, 0, 4.6], face: "you" }
        ], pose: [{ actor: "you", wounded: true }], cut: { pos: [-1.7, 1.55, 8.6], look: [0.5, 1, 5.2] }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "patient", key: "st5l1" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch5_win: function (ctx) {
    return {
      actors: cast(ctx, ["patient", "sheriff"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { mod: "dusk", music: "frontier", place: [
          { actor: "you", at: [0.4, 0, OPP_SPOT.medium + 1.8], face: "patient" },
          { actor: "patient", at: [0.5, 0, OPP_SPOT.medium], seated: "hostage", face: "you" },
          { actor: "sheriff", at: [-2, 0, -5], face: "patient" }
        ], pose: [{ actor: "patient", wounded: true }], cut: { pos: [2.5, 1.65, -9.4], look: [0.4, 1.05, -11.6] }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "patient", key: "st5w1" } },
        { walk: [{ actor: "sheriff", to: [-0.7, 0, -10.6], speed: 1.1, endFace: "patient" }], cam: { pos: [2.2, 1.7, -11.4], look: [-0.9, 1.3, -10.4] }, dur: 3 },
        { say: { actor: "sheriff", key: "st5w2" } },
        { pose: [{ actor: "sheriff", face: "you" }], say: { actor: "sheriff", key: "st5w3" } },
        { say: { actor: "you", key: "st5w4", silent: true }, cam: { pos: [0.4, 2.8, -5], look: [0.4, 1.2, -16], fov: 60 }, dur: 2.4 },
        { fade: "out", dur: 0.8 }
      ]
    };
  },

  ch6_intro: function (ctx) {
    return {
      actors: cast(ctx, ["grace"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "graveyard", mod: "fog", music: "frontier", place: [
          { actor: "you", at: { set: "graveyard", at: [0, 0, 5.6] }, ry: Math.PI },
          { actor: "grace", at: { set: "graveyard", at: [2.05, 0, 0.8] }, face: { set: "graveyard", at: [1.4, 0, 0.8] }, dig: true }
        ], cut: { pos: { set: "graveyard", at: [2.6, 2.3, 8.2] }, look: { set: "graveyard", at: [1.2, 1, 0.8] } }, dur: 0.2 },
        { fade: "in", dur: 0.9 },
        { say: { actor: "you", key: "st6n1", silent: true } },
        { sfx: "crow", walk: [{ actor: "you", to: { set: "graveyard", at: [0, 0, 2.6] } }], cam: { pos: { set: "graveyard", at: [-1.8, 1.8, 5.2] }, look: { set: "graveyard", at: [1.6, 1, 0.8] } }, dur: 3 },
        { cut: { pos: { set: "graveyard", at: [0.4, 1.5, 2.4] }, look: { set: "graveyard", at: [2.1, 0.9, 0.8] } }, dur: 1.3 },
        { say: { actor: "grace", key: "st6i1" } },
        { pose: [{ actor: "you", face: "grace" }], say: { actor: "you", key: "st6i2" }, cut: { pos: { set: "graveyard", at: [1.0, 1.5, -1.0] }, look: { set: "graveyard", at: [1.0, 1.2, 1.7] } } },
        { pose: [{ actor: "grace", dig: false }], dur: 0.4 },
        { pose: [{ actor: "grace", face: "you" }], say: { actor: "grace", key: "st6i3" }, cut: { pos: { set: "graveyard", at: [-0.9, 1.8, 2.9] }, look: { set: "graveyard", at: [2, 1.45, 0.8] } } },
        { say: { actor: "grace", key: "st6i4" }, cam: { pos: { set: "graveyard", at: [0.6, 1.6, 1.8] }, look: { set: "graveyard", at: [2, 1.45, 0.8] }, fov: 50 }, dur: 1.6 },
        { say: { actor: "grace", key: "st6n3", silent: true } }
      ]
    };
  },
  ch6_grace_lose: function (ctx) {
    return {
      actors: cast(ctx, ["grace"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "graveyard", mod: "fog", place: [
          { actor: "you", at: { set: "graveyard", at: [0.4, 0, 2] }, seated: "hostage", face: "grace" },
          { actor: "grace", at: { set: "graveyard", at: [0.6, 0, 3.8] }, face: "you" }
        ], pose: [{ actor: "you", wounded: true }], cut: { pos: { set: "graveyard", at: [-1.5, 1.5, 4.6] }, look: { set: "graveyard", at: [0.5, 1, 2.2] } }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "grace", key: "st6gl1" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch6_mid: function (ctx) {
    return {
      actors: cast(ctx, ["grace", "undertaker"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "graveyard", mod: "fog", place: [
          { actor: "you", at: { set: "graveyard", at: [0, 0, 2.4] }, face: "grace" },
          { actor: "grace", at: { set: "graveyard", at: [1.2, 0, 0.6] }, seated: "hostage", face: "you" }
        ], pose: [{ actor: "grace", wounded: true }], cut: { pos: { set: "graveyard", at: [-2.0, 1.5, 2.7] }, look: { set: "graveyard", at: [1.2, 0.9, 0.8] }, fov: 62 }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "grace", key: "st6m1" } },
        { mod: "dusk", music: "standoff", place: [{ actor: "undertaker", at: { set: "graveyard", at: [-3.4, 0, -4.4] }, face: "you" }], cam: { pos: { set: "graveyard", at: [0.4, 1.6, 1.6] }, look: { set: "graveyard", at: [-3.6, 1.3, -4.2] } }, dur: 1.6 },
        { walk: [{ actor: "undertaker", to: { set: "graveyard", at: [-1, 0, -1.4] }, speed: 1.4, endFace: "you" }], sfx: "duelBell", cam: { pos: { set: "graveyard", at: [0.6, 1.5, 0.8] }, look: { set: "graveyard", at: [-1.4, 1.35, -1.6] }, fov: 58 }, dur: 2.8 },
        { say: { actor: "undertaker", key: "st6m2" } },
        { pose: [{ actor: "you", face: "undertaker" }], say: { actor: "you", key: "st6m3" }, cut: { pos: { set: "graveyard", at: [-1.9, 1.55, -0.8] }, look: { set: "graveyard", at: [0.2, 1.3, 2] } } },
        { say: { actor: "undertaker", key: "st6m4" }, cam: { pos: { set: "graveyard", at: [-0.05, 1.5, -0.3] }, look: { set: "graveyard", at: [-1.05, 1.55, -1.4] }, fov: 46 }, dur: 1.8 },
        { say: { actor: "grace", key: "st6n4", silent: true } }
      ]
    };
  },
  ch6_boss_lose: function (ctx) {
    return {
      actors: cast(ctx, ["undertaker"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "graveyard", mod: "dusk", place: [
          { actor: "you", at: { set: "graveyard", at: [0.6, 0, 1] }, seated: "hostage", face: "undertaker" },
          { actor: "undertaker", at: { set: "graveyard", at: [0.9, 0, 2.6] }, face: "you" }
        ], pose: [{ actor: "you", wounded: true }], cut: { pos: { set: "graveyard", at: [-1.2, 1.55, 3.2] }, look: { set: "graveyard", at: [0.8, 1, 1.4] } }, dur: 0.2 },
        { fade: "in", dur: 0.6 },
        { say: { actor: "undertaker", key: "st6ul1" } },
        { fade: "out", dur: 0.6 }
      ]
    };
  },
  ch6_win: function (ctx) {
    return {
      actors: cast(ctx, ["grace", "sheriff", "barman", "undertaker"]),
      steps: [
        { fade: "out", dur: 0.1 },
        { show: "graveyard", mod: "dusk", music: "frontier", place: [
          { actor: "you", at: { set: "graveyard", at: [0.6, 0, 2.2] }, face: "undertaker" },
          { actor: "undertaker", at: { set: "graveyard", at: [1.1, 0, 0.4] }, ry: 0 },
          { actor: "grace", at: { set: "graveyard", at: [-1.6, 0, 1.4] }, face: "undertaker" }
        ], pose: [{ actor: "undertaker", dead: true, rest: 0.2, settled: true }], cut: { pos: { set: "graveyard", at: [-1.4, 1.7, 4] }, look: { set: "graveyard", at: [0.9, 0.9, 0.8] } }, dur: 0.2 },
        { fade: "in", dur: 0.8 },
        { sfx: "duelBell", dur: 1.2 },
        { say: { actor: "grace", key: "st6w1" } },
        { fade: "out", dur: 0.8 },
        { hideSet: true, mod: "noon", music: "mission", place: [
          { actor: "you", at: [0.4, 0, 2.8], ry: Math.PI },
          { actor: "sheriff", at: [-1.2, 0, 5.4], face: "you" },
          { actor: "barman", at: [2.2, 0, 5.8], face: "you" },
          { actor: "undertaker", at: [0, 0, -100], hidden: true },
          { actor: "grace", at: [2, 0, -100], hidden: true }
        ], cut: { pos: [0.5, 1.7, 7.6], look: [0.4, 1.25, 2.6] }, dur: 0.3 },
        { fade: "in", dur: 0.8 },
        { say: { actor: "sheriff", key: "st6w2" } },
        { say: { actor: "you", key: "st6w3", silent: true }, cam: { pos: [0.4, 3.2, 12], look: [0.4, 1.6, -6], fov: 64 }, dur: 3 },
        { fade: "out", dur: 1 }
      ]
    };
  }
};

export function storyProgress() {
  const raw = localStorage.getItem("hn-story2");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(CHAPTERS.length, Math.floor(value));
}

export function restoreStoryBackup() {
  const remote = Number(cgDataGet("hn-story2"));
  if (Number.isFinite(remote) && remote > storyProgress()) {
    localStorage.setItem("hn-story2", String(Math.min(CHAPTERS.length, Math.floor(remote))));
  }
}

export function completeChapter(index) {
  if (index === storyProgress()) {
    const next = index + 1;
    localStorage.setItem("hn-story2", String(next));
    cgDataSet("hn-story2", String(next));
    reportProgress((next / CHAPTERS.length) * 100);
  }
}
