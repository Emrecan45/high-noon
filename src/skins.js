import * as THREE from "three";
import { createCowboy } from "./cowboy.js";

export const SKINS = [
  {
    id: "drifter",
    price: 0,
    nameKey: "skin.drifter.name",
    colors: { skin: 0xc98f5e, shirt: 0x7a2f24, pants: 0x30425c, hat: 0x4a3018, bandana: 0xc9a227 }
  },
  {
    id: "sheriff",
    price: 150,
    nameKey: "skin.sheriff.name",
    colors: { skin: 0xc98f5e, shirt: 0x8a6f3a, pants: 0x4a3524, hat: 0x6b4a1f, bandana: 0xd8c48a }
  },
  {
    id: "bandit",
    price: 200,
    nameKey: "skin.bandit.name",
    colors: { skin: 0xb5825a, shirt: 0x23211f, pants: 0x1c1a18, hat: 0x141210, bandana: 0xb3271e }
  },
  {
    id: "poncho",
    price: 250,
    nameKey: "skin.poncho.name",
    colors: { skin: 0xa9744a, shirt: 0x2e6b4f, pants: 0x5a4326, hat: 0x7a5a2a, bandana: 0xe0d3a8 }
  },
  {
    id: "cavalry",
    price: 350,
    nameKey: "skin.cavalry.name",
    colors: { skin: 0xc98f5e, shirt: 0x1f3a6b, pants: 0x14243f, hat: 0x2b2b30, bandana: 0xd8b13c }
  },
  {
    id: "undertaker",
    price: 500,
    nameKey: "skin.undertaker.name",
    colors: { skin: 0xd0b294, shirt: 0x2b2233, pants: 0x191423, hat: 0x0f0c14, bandana: 0x8a8f98 }
  },
  {
    id: "ghost",
    price: 650,
    nameKey: "skin.ghost.name",
    colors: { skin: 0xd8cdbf, shirt: 0xcfc6b8, pants: 0xa89f8f, hat: 0xe4dccd, bandana: 0xffffff }
  },
  {
    id: "golden",
    price: 900,
    nameKey: "skin.golden.name",
    colors: { skin: 0xc98f5e, shirt: 0xd4a017, pants: 0x8a6510, hat: 0xe8b64c, bandana: 0xfff1c4 }
  },
  {
    id: "marshal",
    price: 300,
    nameKey: "skin.marshal.name",
    colors: { skin: 0xc98f5e, shirt: 0x3a3a44, pants: 0x22222a, hat: 0x3a3a44, bandana: 0xd8b13c }
  },
  {
    id: "outlaw",
    price: 250,
    nameKey: "skin.outlaw.name",
    colors: { skin: 0xb5825a, shirt: 0x5a3a2a, pants: 0x3a2a1e, hat: 0x2a1c12, bandana: 0x1a1a1a }
  },
  {
    id: "rangercoat",
    price: 350,
    nameKey: "skin.rangercoat.name",
    colors: { skin: 0xc98f5e, shirt: 0x6b5232, pants: 0x3e3020, hat: 0x8a6a3c, bandana: 0x2e4a3a }
  },
  {
    id: "gambler",
    price: 400,
    nameKey: "skin.gambler.name",
    colors: { skin: 0xd0b294, shirt: 0x8a1e2a, pants: 0x1c1c22, hat: 0x14141a, bandana: 0xe8e0cf }
  },
  {
    id: "vaquero",
    price: 300,
    nameKey: "skin.vaquero.name",
    colors: { skin: 0xa9744a, shirt: 0xb05a1e, pants: 0x4a3018, hat: 0x6b4a1f, bandana: 0xe8c87a }
  },
  {
    id: "preacher",
    price: 450,
    nameKey: "skin.preacher.name",
    colors: { skin: 0xd8c2a8, shirt: 0x1a1a1e, pants: 0x121216, hat: 0x1a1a1e, bandana: 0xf0ede4 }
  },
  {
    id: "miner",
    price: 200,
    nameKey: "skin.miner.name",
    colors: { skin: 0xb5825a, shirt: 0x4a5a6b, pants: 0x5a4326, hat: 0x8a7042, bandana: 0xa84632 }
  },
  {
    id: "tracker",
    price: 250,
    nameKey: "skin.tracker.name",
    colors: { skin: 0xa9744a, shirt: 0x556b4a, pants: 0x3a3026, hat: 0x4a3e28, bandana: 0xc9a227 }
  },
  {
    id: "duchess",
    price: 500,
    nameKey: "skin.duchess.name",
    colors: { skin: 0xd8c2a8, shirt: 0x6b2a5a, pants: 0x2a1428, hat: 0x4a1e40, bandana: 0xe8d8b0 }
  },
  {
    id: "kid",
    price: 200,
    nameKey: "skin.kid.name",
    colors: { skin: 0xd0a274, shirt: 0x4a76a8, pants: 0x30425c, hat: 0xb59a5c, bandana: 0xd85a3a }
  },
  {
    id: "mariachi",
    price: 550,
    nameKey: "skin.mariachi.name",
    colors: { skin: 0xa9744a, shirt: 0x2a2a30, pants: 0x1e1e24, hat: 0x2a2a30, bandana: 0xd8b13c }
  },
  {
    id: "sombra",
    price: 600,
    nameKey: "skin.sombra.name",
    colors: { skin: 0x8a6a52, shirt: 0x2a1e3a, pants: 0x1a1226, hat: 0x120c1e, bandana: 0x6b46a8 }
  },
  {
    id: "bounty",
    price: 650,
    nameKey: "skin.bounty.name",
    colors: { skin: 0xb5825a, shirt: 0x7a1e1e, pants: 0x26201a, hat: 0x1c1610, bandana: 0xd8d0c0 }
  },
  {
    id: "bluecoat",
    price: 350,
    nameKey: "skin.bluecoat.name",
    colors: { skin: 0xc98f5e, shirt: 0x2a4a8a, pants: 0x1c3054, hat: 0x14243f, bandana: 0xe8b64c }
  },
  {
    id: "nightowl",
    price: 700,
    nameKey: "skin.nightowl.name",
    colors: { skin: 0x9a8a76, shirt: 0x16161c, pants: 0x101014, hat: 0x0c0c10, bandana: 0x4a6b8a }
  },
  {
    id: "eldorado",
    price: 950,
    nameKey: "skin.eldorado.name",
    colors: { skin: 0xc98f5e, shirt: 0xe8c05a, pants: 0xb08a2a, hat: 0xf0d070, bandana: 0x8a1e2a }
  }
];

export function rarityOf(price) {
  if (price >= 600) {
    return "legendary";
  }
  if (price >= 450) {
    return "epic";
  }
  if (price >= 250) {
    return "rare";
  }
  return "common";
}

export function skinById(id) {
  for (const skin of SKINS) {
    if (skin.id === id) {
      return skin;
    }
  }
  return SKINS[0];
}

export const AI_SKINS = {
  nervous: {
    colors: { skin: 0xc0895a, shirt: 0x9c2b22, pants: 0x33241a, hat: 0x5a3a18, bandana: 0xf0cf3e },
    weapon: "rose",
    acc: ["mustache"]
  },
  rapido: {
    colors: { skin: 0xa9744a, shirt: 0x1f6b47, pants: 0x22331d, hat: 0x2c4a2a, bandana: 0xe9e2c4 },
    weapon: "ranger",
    acc: ["poncho", "cigar"]
  },
  patient: {
    colors: { skin: 0xd0b294, shirt: 0x241a2e, pants: 0x14101c, hat: 0x0e0a14, bandana: 0x8a4f8a },
    weapon: "ivory",
    acc: ["beard", "eyepatch"]
  },
  training: {
    colors: { skin: 0xc9a06a, shirt: 0xb59a5c, pants: 0x8a7042, hat: 0xd8c48a, bandana: 0x7a2f24 },
    weapon: "iron",
    acc: ["feather"]
  },
  grace: {
    colors: { skin: 0xd8c2a8, shirt: 0x2a2a30, pants: 0x1c1c22, hat: 0x14141a, bandana: 0xe8e2d4 },
    weapon: "silver",
    acc: ["star"]
  },
  undertaker: {
    colors: { skin: 0xd0b294, shirt: 0x16121c, pants: 0x0e0b12, hat: 0x0a080e, bandana: 0x3a3a44 },
    weapon: "golden",
    acc: ["eyepatch", "cigar"]
  }
};

export function aiSkinFor(id) {
  const found = AI_SKINS[id];
  if (found !== undefined) {
    return found;
  }
  return { colors: SKINS[0].colors, weapon: "iron", acc: [] };
}

let portraitKit = null;
const portraitCache = new Map();

function ensurePortraitKit() {
  if (portraitKit !== null) {
    return portraitKit;
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0.18, 1.66, 1.95);
  camera.lookAt(0, 1.54, 0);
  const hemi = new THREE.HemisphereLight(0xffe8c0, 0x4a3620, 1.35);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xfff2d8, 1.9);
  dir.position.set(1.6, 3, 2.5);
  scene.add(dir);
  const model = createCowboy();
  model.group.rotation.y = 0.4;
  if (model.gun) {
    model.gun.visible = false;
  }
  scene.add(model.group);
  portraitKit = { renderer: renderer, scene: scene, camera: camera, model: model };
  return portraitKit;
}

function bustCamera(kit) {
  kit.camera.position.set(0.18, 1.66, 1.95);
  kit.camera.lookAt(0, 1.54, 0);
  kit.camera.aspect = 1;
  kit.camera.updateProjectionMatrix();
}

export function portraitDataUrl(skinId, size, acc) {
  const list = Array.isArray(acc) ? acc : [];
  const key = skinId + "|" + list.join(",") + "@" + size;
  const cached = portraitCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const kit = ensurePortraitKit();
  kit.model.setSkin(skinById(skinId).colors);
  kit.model.setAccessories(list);
  bustCamera(kit);
  kit.renderer.setSize(size, size, false);
  kit.renderer.render(kit.scene, kit.camera);
  const url = kit.renderer.domElement.toDataURL();
  portraitCache.set(key, url);
  return url;
}

export function portraitColorsDataUrl(colors, acc, size) {
  const list = acc || [];
  const key = JSON.stringify(colors) + "|" + list.join(",") + "@" + size;
  const cached = portraitCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const kit = ensurePortraitKit();
  kit.model.setSkin(colors);
  kit.model.setAccessories(list);
  bustCamera(kit);
  kit.renderer.setSize(size, size, false);
  kit.renderer.render(kit.scene, kit.camera);
  const url = kit.renderer.domElement.toDataURL();
  kit.model.setAccessories([]);
  portraitCache.set(key, url);
  return url;
}

const figureCache = new Map();

export function figureDataUrl(skinId, w, h) {
  const key = skinId + "@fig" + w + "x" + h;
  const cached = figureCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const kit = ensurePortraitKit();
  kit.model.setSkin(skinById(skinId).colors);
  kit.model.setAccessories([]);
  kit.camera.position.set(0.32, 1.05, 3.7);
  kit.camera.lookAt(0, 0.9, 0);
  kit.camera.aspect = w / h;
  kit.camera.updateProjectionMatrix();
  kit.renderer.setSize(w, h, false);
  kit.renderer.render(kit.scene, kit.camera);
  const url = kit.renderer.domElement.toDataURL();
  figureCache.set(key, url);
  bustCamera(kit);
  return url;
}
