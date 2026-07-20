import * as THREE from "three";
import { createCowboy } from "./cowboy.js";
import { weaponById } from "./weapons.js";

export const SKINS = [
  {
    id: "drifter",
    outfit: { kind: "suspenders", c1: 0x4a3018 },
    price: 0,
    nameKey: "skin.drifter.name",
    colors: { skin: 0xc98f5e, shirt: 0x7a2f24, pants: 0x30425c, hat: 0x4a3018, bandana: 0xc9a227 }
  },
  {
    id: "sheriff",
    outfit: { kind: "vest", c1: 0x3f2a14, c2: 0xd8b13c },
    price: 100,
    nameKey: "skin.sheriff.name",
    colors: { skin: 0xc98f5e, shirt: 0x8a6f3a, pants: 0x4a3524, hat: 0x6b4a1f, bandana: 0xd8c48a }
  },
  {
    id: "bandit",
    outfit: { kind: "crossstrap", c1: 0x35230f, c2: 0xd8b13c },
    price: 150,
    nameKey: "skin.bandit.name",
    colors: { skin: 0xb5825a, shirt: 0x23211f, pants: 0x1c1a18, hat: 0x141210, bandana: 0xb3271e }
  },
  {
    id: "cavalry",
    outfit: { kind: "cavalry", c1: 0x2a4a8a, c2: 0xe8b64c },
    price: 300,
    nameKey: "skin.cavalry.name",
    colors: { skin: 0xc98f5e, shirt: 0x2a4a8a, pants: 0x2a4a8a, hat: 0x1c3054, bandana: 0xe8b64c }
  },
  {
    id: "undertaker",
    outfit: { kind: "frock", c1: 0x362145, c2: 0x8a8f98 },
    price: 500,
    rarity: "rare",
    nameKey: "skin.undertaker.name",
    colors: { skin: 0xd0b294, shirt: 0x412954, pants: 0x191423, hat: 0x181424, bandana: 0x8a8f98 }
  },
  {
    id: "ghost",
    outfit: { kind: "tatters", c1: 0xcfc6b8 },
    price: 600,
    nameKey: "skin.ghost.name",
    colors: { skin: 0xd8cdbf, shirt: 0xcfc6b8, pants: 0xa89f8f, hat: 0xe4dccd, bandana: 0xffffff }
  },
  {
    id: "golden",
    outfit: { kind: "tailcoat", c1: 0xd4a017, c2: 0xfff1c4, c3: 0x8a6510 },
    price: 800,
    nameKey: "skin.golden.name",
    colors: { skin: 0xc98f5e, shirt: 0xd4a017, pants: 0x8a6510, hat: 0xe8b64c, bandana: 0xfff1c4 }
  },
  {
    id: "marshal",
    outfit: { kind: "duster", c1: 0x3a3a44 },
    price: 150,
    nameKey: "skin.marshal.name",
    colors: { skin: 0xc98f5e, shirt: 0x3a3a44, pants: 0x22222a, hat: 0x3a3a44, bandana: 0xd8b13c }
  },
  {
    id: "preacher",
    outfit: { kind: "cassock", c1: 0x1a1a1e, c2: 0xf0ede4, c3: 0xd8b13c },
    price: 350,
    nameKey: "skin.preacher.name",
    colors: { skin: 0xd8c2a8, shirt: 0x1a1a1e, pants: 0x141416, hat: 0x1a1a1e, bandana: 0xf0ede4 }
  },
  {
    id: "duchess",
    outfit: { kind: "dress", c1: 0x6b2a5a, c2: 0x4a1e40, c3: 0xe8d8b0 },
    price: 350,
    nameKey: "skin.duchess.name",
    colors: { skin: 0xd8c2a8, shirt: 0x6b2a5a, pants: 0x2a1428, hat: 0x4a1e40, bandana: 0xe8d8b0 }
  },
  {
    id: "kid",
    outfit: { kind: "overalls", c1: 0x30425c, c2: 0xd8b13c },
    price: 150,
    nameKey: "skin.kid.name",
    colors: { skin: 0xd0a274, shirt: 0x4a76a8, pants: 0x30425c, hat: 0xb59a5c, bandana: 0xd85a3a }
  },
  {
    id: "mariachi",
    outfit: { kind: "bolero", c1: 0x2a2a30, c2: 0x8a1e2a, c3: 0xd8b13c },
    price: 200,
    nameKey: "skin.mariachi.name",
    colors: { skin: 0xa9744a, shirt: 0x2a2a30, pants: 0x1e1e24, hat: 0x2a2a30, bandana: 0xd8b13c }
  },
  {
    id: "sombra",
    outfit: { kind: "shroud", c1: 0x2c1b45, c2: 0x8254cf, c3: 0x4a2e78 },
    price: 350,
    nameKey: "skin.sombra.name",
    colors: { skin: 0x8a6a52, shirt: 0x38225a, pants: 0x24163b, hat: 0x2b1b42, bandana: 0x8254cf }
  },

  {
    id: "nightowl",
    outfit: { kind: "cloak", c1: 0x232938, c2: 0x5486ba },
    price: 0,
    event: true,
    rarity: "epic",
    nameKey: "skin.nightowl.name",
    colors: { skin: 0x9a8a76, shirt: 0x232938, pants: 0x141822, hat: 0x141822, bandana: 0x5486ba }
  },
  {
    id: "eldorado",
    outfit: { kind: "poncho", c1: 0xe8c05a, c2: 0x8a1e2a },
    price: 200,
    nameKey: "skin.eldorado.name",
    colors: { skin: 0xc98f5e, shirt: 0xe8c05a, pants: 0xb08a2a, hat: 0xf0d070, bandana: 0x8a1e2a }
  },
  {
    id: "trapper",
    outfit: { kind: "furcoat", c1: 0x4a3420, c2: 0xcfc0a8 },
    price: 0,
    event: true,
    rarity: "epic",
    nameKey: "skin.trapper.name",
    colors: { skin: 0xc98f5e, shirt: 0x4a3420, pants: 0x3a2a18, hat: 0x5a4326, bandana: 0xcfc0a8 }
  },
  {
    id: "skeleton",
    outfit: { kind: "bones", c1: 0x14141a, c2: 0xe8e4dc },
    price: 0,
    event: true,
    rarity: "legendary",
    nameKey: "skin.skeleton.name",
    colors: { skin: 0xd8d4cc, shirt: 0x14141a, pants: 0x0e0e12, hat: 0x0e0e12, bandana: 0x1a1a1e }
  },
  {
    id: "bounty",
    outfit: { kind: "serape", c1: 0x7a1e1e, c2: 0xd8d0c0 },
    price: 0,
    event: true,
    rarity: "rare",
    nameKey: "skin.bounty.name",
    colors: { skin: 0xb5825a, shirt: 0x7a1e1e, pants: 0x26201a, hat: 0x1c1610, bandana: 0xd8d0c0 }
  },
  {
    id: "gambler",
    outfit: { kind: "suit", c1: 0x2a1418, c2: 0xffffff, c3: 0x8a1e2a },
    price: 0,
    event: true,
    rarity: "epic",
    nameKey: "skin.riverboat.name",
    colors: { skin: 0xd0b294, shirt: 0x5c1a2a, pants: 0x2a1218, hat: 0x1a0e12, bandana: 0xe8e0cf }
  },
  {
    id: "calamity",
    outfit: { kind: "fringe", c1: 0x8a6a3c, c2: 0xd8c48a },
    price: 200,
    nameKey: "skin.calamity.name",
    colors: { skin: 0xd8b892, shirt: 0x8a6a3c, pants: 0x5a4326, hat: 0x6b4a2a, bandana: 0xa83c2a }
  },
  {
    id: "phantom",
    outfit: { kind: "greatcoat", c1: 0x5a6b7a },
    price: 0,
    event: true,
    rarity: "epic",
    nameKey: "skin.phantom.name",
    colors: { skin: 0xc8d0d8, shirt: 0x4a5a6a, pants: 0x3a4a5a, hat: 0x2a3a4a, bandana: 0x8a9aaa }
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

export function skinRarity(skin) {
  if (skin && skin.rarity) {
    return skin.rarity;
  }
  return rarityOf(skin ? skin.price : 0);
}

export const AI_SKINS = {
  nervous: {
    colors: { skin: 0xd0a878, shirt: 0x6e2f3a, pants: 0x2a2622, hat: 0x9c855a, bandana: 0x3a4a5c },
    weapon: "rose",
    acc: ["bandolier"]
  },
  rapido: {
    colors: { skin: 0xa9744a, shirt: 0x1f6b47, pants: 0x22331d, hat: 0x2c4a2a, bandana: 0xe9e2c4 },
    weapon: "ranger",
    acc: ["cigar"]
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
    colors: skinById("preacher").colors,
    outfit: skinById("preacher").outfit,
    weapon: "silver",
    acc: []
  },
  undertaker: {
    colors: skinById("undertaker").colors,
    outfit: skinById("undertaker").outfit,
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

function bustCamera(kit, size) {
  kit.camera.position.set(0.18, 1.35, 2.3);
  kit.camera.lookAt(0, 1.45, 0);
  kit.camera.aspect = 1;
  kit.camera.updateProjectionMatrix();
}

function applyPortraitPose(kit, list) {
  kit.model.reset();
  kit.model.group.rotation.y = 0.4;
  const draw = list.indexOf("pose-draw") !== -1;
  const holster = list.indexOf("pose-holster") !== -1;
  kit.model.holdGun(draw, true);
  kit.model.setHolsterHand(holster);
  if (kit.model.gun) {
    kit.model.gun.visible = draw;
  }
  kit.model.update(3);
  kit.model.update(3);
}

export function portraitDataUrl(skinId, size, acc, weaponId) {
  const list = Array.isArray(acc) ? acc : [];
  const key = skinId + "|" + list.join(",") + "|" + (weaponId || "iron") + "@" + size;
  const cached = portraitCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const kit = ensurePortraitKit();
  kit.model.setSkin(skinById(skinId).colors);
  kit.model.setOutfit(skinById(skinId).outfit || null);
  kit.model.setAccessories(list);
  kit.model.setWeapon(weaponById(weaponId || "iron").colors);
  applyPortraitPose(kit, list);
  bustCamera(kit, size);
  kit.renderer.setSize(size, size, false);
  kit.renderer.render(kit.scene, kit.camera);
  const url = kit.renderer.domElement.toDataURL();
  portraitCache.set(key, url);
  return url;
}

export function portraitColorsDataUrl(colors, acc, size, outfit) {
  const list = acc || [];
  const key = JSON.stringify(colors) + "|" + list.join(",") + "@" + size + "|" + JSON.stringify(outfit || null);
  const cached = portraitCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const kit = ensurePortraitKit();
  kit.model.setSkin(colors);
  kit.model.setOutfit(outfit || null);
  kit.model.setAccessories(list);
  applyPortraitPose(kit, list);
  bustCamera(kit, size);
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
  kit.model.setOutfit(skinById(skinId).outfit || null);
  kit.model.setAccessories([]);
  applyPortraitPose(kit, []);
  kit.camera.position.set(0.32, 1.05, 3.7);
  kit.camera.lookAt(0, 0.9, 0);
  kit.camera.aspect = w / h;
  kit.camera.updateProjectionMatrix();
  kit.renderer.setSize(w, h, false);
  kit.renderer.render(kit.scene, kit.camera);
  const url = kit.renderer.domElement.toDataURL();
  figureCache.set(key, url);
  bustCamera(kit, 0);
  return url;
}
