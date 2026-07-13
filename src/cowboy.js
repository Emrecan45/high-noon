import * as THREE from "three";
import { createRevolver } from "./revolver.js";
import { seasonBadgeInfo } from "./accessories.js";

function mat(color) {
  return new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  return mesh;
}

export function makeStarMesh(outer, depth, material) {
  const shape = new THREE.Shape();
  const inner = outer * 0.41;
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const b = a + Math.PI / 5;
    if (i === 0) {
      shape.moveTo(Math.cos(a) * outer, -Math.sin(a) * outer);
    } else {
      shape.lineTo(Math.cos(a) * outer, -Math.sin(a) * outer);
    }
    shape.lineTo(Math.cos(b) * inner, -Math.sin(b) * inner);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

export function createCowboy() {
  const group = new THREE.Group();
  const hitMeshes = [];

  const mats = {
    skin: mat(0xc98f5e),
    shirt: mat(0x7a2f24),
    pants: mat(0x30425c),
    hat: mat(0x4a3018),
    bandana: mat(0xc9a227)
  };
  const leather = mat(0x4a3018);
  const darkLeather = mat(0x35230f);

  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.12, 0.86, 0);
    const thigh = box(0.17, 0.42, 0.2, mats.pants);
    thigh.position.y = -0.21;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);
    const shin = box(0.15, 0.4, 0.17, mats.pants);
    shin.position.y = -0.2;
    knee.add(shin);
    const boot = box(0.17, 0.14, 0.3, leather);
    boot.position.set(0, -0.4, 0.05);
    knee.add(boot);
    const spur = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.015, 6), mat(0xb8b8c0));
    spur.rotation.z = Math.PI / 2;
    spur.position.set(0, -0.4, -0.11);
    knee.add(spur);
    group.add(hip);
    return { hip: hip, knee: knee, thigh: thigh, shin: shin };
  }

  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.86;
  group.add(torsoPivot);

  const torso = box(0.5, 0.56, 0.26, mats.shirt);
  torso.position.y = 0.3;
  torsoPivot.add(torso);
  const shoulders = box(0.56, 0.12, 0.27, mats.shirt);
  shoulders.position.y = 0.55;
  torsoPivot.add(shoulders);
  const belt = box(0.52, 0.09, 0.28, leather);
  belt.position.y = 0.01;
  torsoPivot.add(belt);
  const buckle = box(0.08, 0.06, 0.02, mat(0xd8b13c));
  buckle.position.set(0, 0.01, 0.15);
  torsoPivot.add(buckle);
  const bandana = box(0.2, 0.1, 0.2, mats.bandana);
  bandana.position.y = 0.62;
  torsoPivot.add(bandana);

  const head = box(0.26, 0.26, 0.24, mats.skin);
  head.position.y = 0.8;
  torsoPivot.add(head);
  const nose = box(0.05, 0.06, 0.05, mats.skin);
  nose.position.set(0, 0.78, 0.13);
  torsoPivot.add(nose);

  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 14), mats.hat);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.19, 12), mats.hat);
  crown.position.y = 0.1;
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.05, 12), darkLeather);
  hatBand.position.y = 0.035;
  brim.castShadow = true;
  crown.castShadow = true;
  hat.add(brim);
  hat.add(crown);
  hat.add(hatBand);
  hat.position.y = 0.925;
  torsoPivot.add(hat);

  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.33, 0.52, 0);
    torsoPivot.add(shoulder);
    const upper = box(0.12, 0.3, 0.12, mats.shirt);
    upper.position.y = -0.15;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    const forearm = box(0.11, 0.28, 0.11, mats.shirt);
    forearm.position.y = -0.14;
    elbow.add(forearm);
    const hand = box(0.1, 0.09, 0.1, mats.skin);
    hand.position.y = -0.31;
    elbow.add(hand);
    return { shoulder: shoulder, elbow: elbow, upper: upper, forearm: forearm, hand: hand };
  }

  const armL = makeArm(1);
  const armR = makeArm(-1);

  const gunMats = {
    body: mat(0x2c2c30),
    metal: mat(0x3a3a40),
    grip: mat(0x5c3a1e)
  };

  const holster = new THREE.Group();
  const holsterPocket = box(0.1, 0.42, 0.2, darkLeather);
  holsterPocket.rotation.z = 0.12;
  holsterPocket.position.set(0, -0.12, -0.02);
  holster.add(holsterPocket);
  holster.position.set(-0.28, -0.08, 0.02);
  torsoPivot.add(holster);

  const holsterGun = createRevolver(gunMats, false);
  holsterGun.scale.setScalar(1.35);
  holsterGun.rotation.set(-Math.PI / 2 + 0.2, 0, Math.PI + 0.12);
  holsterGun.position.set(-0.29, 0.1, 0.02);
  torsoPivot.add(holsterGun);

  const handGun = createRevolver(gunMats, false);
  handGun.scale.setScalar(1.35);
  handGun.rotation.set(-Math.PI / 2, 0, Math.PI);
  handGun.position.set(0, -0.34, 0.02);
  handGun.visible = false;
  armR.elbow.add(handGun);

  const shovel = new THREE.Group();
  const shovelStick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.05, 6), leather);
  shovelStick.position.y = -0.32;
  shovel.add(shovelStick);
  const shovelBlade = box(0.15, 0.24, 0.025, mat(0x3a3a40));
  shovelBlade.position.y = -0.92;
  shovel.add(shovelBlade);
  const shovelGrip = box(0.1, 0.03, 0.03, leather);
  shovelGrip.position.y = 0.21;
  shovel.add(shovelGrip);
  shovel.rotation.x = 0.6;
  shovel.position.set(0, -0.31, 0.06);
  shovel.visible = false;
  armR.elbow.add(shovel);

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.44, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 1 })
  );
  flash.rotation.x = Math.PI;
  flash.position.set(0, -0.76, -0.03);
  flash.visible = false;
  armR.elbow.add(flash);
  const flashLight = new THREE.PointLight(0xffc26b, 0, 8);
  flashLight.position.set(0, -0.74, -0.03);
  armR.elbow.add(flashLight);

  head.userData.part = "head";
  nose.userData.part = "head";
  hat.traverse(function (child) {
    child.userData.part = "hat";
  });
  const bodyParts = [torso, shoulders, belt, legL.thigh, legL.shin, legR.thigh, legR.shin, armL.upper, armL.forearm, armR.upper, armR.forearm];
  for (const part of bodyParts) {
    part.userData.part = "body";
  }

  hitMeshes.push(head, nose, brim, crown, torso, shoulders, belt, legL.thigh, legL.shin, legR.thigh, legR.shin, armL.upper, armL.forearm, armR.upper, armR.forearm);

  const anim = {
    time: 0,
    armTarget: 0,
    armCurrent: 0,
    dodgeTarget: 0,
    dodgeCurrent: 0,
    death: null,
    flinch: 0,
    flashUntil: 0,
    wounded: false,
    walk: false,
    walkPhase: 0,
    drawn: false,
    talk: false,
    talkSeed: Math.random() * 10,
    dig: false,
    digSeed: Math.random() * 10,
    seated: false,
    seatFloor: false,
    idleSeed: Math.random() * 10,
    hatFlying: false,
    hatVel: new THREE.Vector3(),
    hatSpin: new THREE.Vector3()
  };

  function setSkin(colors) {
    mats.skin.color.setHex(colors.skin);
    mats.shirt.color.setHex(colors.shirt);
    mats.pants.color.setHex(colors.pants);
    mats.hat.color.setHex(colors.hat);
    mats.bandana.color.setHex(colors.bandana);
  }

  const accParts = [];

  function clearAccessories() {
    for (const part of accParts) {
      part.parent.remove(part);
    }
    accParts.length = 0;
  }

  function addAcc(parent, mesh) {
    parent.add(mesh);
    accParts.push(mesh);
  }

  function setWeapon(colors) {
    gunMats.body.color.setHex(colors.body);
    gunMats.metal.color.setHex(colors.metal);
    if (colors.grip) {
      gunMats.grip.color.setHex(colors.grip);
    }
  }

  function setAccessories(list) {
    clearAccessories();
    if (!Array.isArray(list)) {
      return;
    }
    for (const id of list) {
      const pZ = list.indexOf("poncho") !== -1 ? 0.06 : 0;
      if (id === "mustache") {
        const part = box(0.16, 0.035, 0.03, mat(0x2a1c10));
        part.position.set(0, 0.75, 0.13);
        addAcc(torsoPivot, part);
      } else if (id === "beard") {
        const part = box(0.24, 0.1, 0.05, mat(0x3a2a18));
        part.position.set(0, 0.7, 0.11);
        addAcc(torsoPivot, part);
      } else if (id === "cigar") {
        const part = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), mat(0x5c3a1e));
        part.rotation.x = Math.PI / 2;
        part.rotation.z = 0.3;
        part.position.set(0.06, 0.73, 0.16);
        addAcc(torsoPivot, part);
      } else if (id === "eyepatch") {
        const part = box(0.07, 0.05, 0.02, mat(0x14100a));
        part.position.set(0.06, 0.83, 0.125);
        addAcc(torsoPivot, part);
        const strap = box(0.27, 0.018, 0.02, mat(0x14100a));
        strap.position.set(0, 0.85, 0.12);
        addAcc(torsoPivot, strap);
      } else if (id === "star") {
        const part = makeStarMesh(0.06, 0.02, mat(0xe8b64c));
        part.position.set(-0.15, 0.43, 0.15 + pZ);
        addAcc(torsoPivot, part);
      } else if (id === "cross") {
        const post = box(0.024, 0.11, 0.016, mat(0xd8c48a));
        post.position.set(0, 0.45, 0.15 + pZ);
        addAcc(torsoPivot, post);
        const beam = box(0.07, 0.024, 0.016, mat(0xd8c48a));
        beam.position.set(0, 0.475, 0.15 + pZ);
        addAcc(torsoPivot, beam);
        const cord = box(0.012, 0.06, 0.012, mat(0x3a2a18));
        cord.position.set(0, 0.54, 0.14 + pZ);
        addAcc(torsoPivot, cord);
      } else if (id === "poncho") {
        const front = box(0.58, 0.4, 0.06, mat(0x2e6b4f));
        front.position.set(0, 0.4, 0.15);
        front.rotation.x = 0.08;
        addAcc(torsoPivot, front);
        const backPart = box(0.58, 0.4, 0.06, mat(0x2e6b4f));
        backPart.position.set(0, 0.4, -0.15);
        backPart.rotation.x = -0.08;
        addAcc(torsoPivot, backPart);
      } else if (id === "feather") {
        const part = box(0.03, 0.16, 0.02, mat(0xc0392b));
        part.position.set(0.13, 0.16, 0);
        addAcc(hat, part);
      } else if (id === "monocle") {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), mat(0xd8b13c));
        rim.position.set(0.06, 0.84, 0.135);
        addAcc(torsoPivot, rim);
        const chain = box(0.012, 0.1, 0.012, mat(0xd8b13c));
        chain.position.set(0.1, 0.76, 0.13);
        addAcc(torsoPivot, chain);
      } else if (id === "scarf") {
        const wrap = box(0.3, 0.12, 0.3, mat(0xa83c2a));
        wrap.position.y = 0.62;
        addAcc(torsoPivot, wrap);
        const tail = box(0.12, 0.3, 0.05, mat(0xa83c2a));
        tail.position.set(0.08, 0.44, -0.17);
        tail.rotation.x = 0.1;
        addAcc(torsoPivot, tail);
      } else if (id === "bandolier") {
        const strap = box(0.09, 0.62, 0.03, mat(0x4a3018));
        strap.position.set(0, 0.32, 0.15 + pZ);
        strap.rotation.z = 0.65;
        addAcc(torsoPivot, strap);
        for (let bi = 0; bi < 3; bi++) {
          const bullet = box(0.025, 0.06, 0.02, mat(0xd8b13c));
          bullet.position.set(-0.12 + bi * 0.12, 0.42 - bi * 0.09, 0.165 + pZ);
          addAcc(torsoPivot, bullet);
        }
      } else if (id === "goldtooth") {
        const tooth = box(0.03, 0.025, 0.02, mat(0xe8b64c));
        tooth.position.set(0.035, 0.725, 0.125);
        addAcc(torsoPivot, tooth);
      } else if (id === "pipe") {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), mat(0x5c3a1e));
        stem.rotation.x = Math.PI / 2 - 0.35;
        stem.position.set(-0.06, 0.72, 0.16);
        addAcc(torsoPivot, stem);
        const bowl = box(0.04, 0.05, 0.04, mat(0x3a2412));
        bowl.position.set(-0.075, 0.7, 0.2);
        addAcc(torsoPivot, bowl);
      } else if (id === "skullbadge") {
        const badge = box(0.06, 0.06, 0.02, mat(0xe8e0cf));
        badge.position.set(0.15, 0.45, 0.16 + pZ);
        addAcc(torsoPivot, badge);
        const eyeL = box(0.014, 0.014, 0.022, mat(0x14100a));
        eyeL.position.set(0.135, 0.455, 0.162 + pZ);
        addAcc(torsoPivot, eyeL);
        const eyeR = box(0.014, 0.014, 0.022, mat(0x14100a));
        eyeR.position.set(0.165, 0.455, 0.162 + pZ);
        addAcc(torsoPivot, eyeR);
      } else if (id === "hatband") {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.172, 0.055, 12), mat(0xd8b13c));
        band.position.y = 0.045;
        addAcc(hat, band);
      } else if (id === "sideburns") {
        const left = box(0.035, 0.13, 0.06, mat(0x3a2a18));
        left.position.set(-0.135, 0.79, 0.06);
        addAcc(torsoPivot, left);
        const right = box(0.035, 0.13, 0.06, mat(0x3a2a18));
        right.position.set(0.135, 0.79, 0.06);
        addAcc(torsoPivot, right);
      } else if (id === "longhair") { hat.visible = false; const hair = box(0.24, 0.35, 0.22, mat(0x2c2418)); hair.position.set(0, 0.72, -0.05); addAcc(torsoPivot, hair); } else if (id === "warpaint") {
        const lineL = box(0.06, 0.015, 0.02, mat(0xc0392b));
        lineL.position.set(-0.08, 0.79, 0.125);
        addAcc(torsoPivot, lineL);
        const lineL2 = box(0.06, 0.015, 0.02, mat(0xc0392b));
        lineL2.position.set(-0.08, 0.755, 0.125);
        addAcc(torsoPivot, lineL2);
        const lineR = box(0.06, 0.015, 0.02, mat(0xc0392b));
        lineR.position.set(0.08, 0.79, 0.125);
        addAcc(torsoPivot, lineR);
        const lineR2 = box(0.06, 0.015, 0.02, mat(0xc0392b));
        lineR2.position.set(0.08, 0.755, 0.125);
        addAcc(torsoPivot, lineR2);
      } else if (id === "goatee") {
        const part = box(0.09, 0.09, 0.05, mat(0x2a1c10));
        part.position.set(0, 0.66, 0.12);
        addAcc(torsoPivot, part);
      } else if (id === "handlebar") {
        const bar = box(0.18, 0.03, 0.03, mat(0x2a1c10));
        bar.position.set(0, 0.75, 0.13);
        addAcc(torsoPivot, bar);
        for (const sx of [-1, 1]) {
          const tip = box(0.04, 0.05, 0.03, mat(0x2a1c10));
          tip.position.set(sx * 0.1, 0.775, 0.13);
          addAcc(torsoPivot, tip);
        }
      } else if (id === "chinstrap") {
        for (const sx of [-1, 1]) {
          const side = box(0.035, 0.14, 0.05, mat(0x3a2a18));
          side.position.set(sx * 0.135, 0.72, 0.06);
          addAcc(torsoPivot, side);
        }
        const chin = box(0.22, 0.04, 0.05, mat(0x3a2a18));
        chin.position.set(0, 0.65, 0.09);
        addAcc(torsoPivot, chin);
      } else if (id === "toothpick") {
        const part = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 5), mat(0xc8a86a));
        part.rotation.x = Math.PI / 2;
        part.rotation.z = 0.4;
        part.position.set(0.05, 0.73, 0.15);
        addAcc(torsoPivot, part);
      } else if (id === "cigarette") {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.11, 6), mat(0xf0ead8));
        stick.rotation.x = Math.PI / 2;
        stick.position.set(0.05, 0.73, 0.16);
        addAcc(torsoPivot, stick);
        const ember = box(0.018, 0.018, 0.02, mat(0xff7a3c));
        ember.position.set(0.05, 0.73, 0.215);
        addAcc(torsoPivot, ember);
      } else if (id === "matchstick") {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5), mat(0xc8a86a));
        stick.rotation.x = Math.PI / 2;
        stick.position.set(0.05, 0.73, 0.16);
        addAcc(torsoPivot, stick);
        const tip = box(0.02, 0.02, 0.02, mat(0xc0392b));
        tip.position.set(0.05, 0.73, 0.21);
        addAcc(torsoPivot, tip);
      } else if (id === "rose") {
        const stem = box(0.012, 0.07, 0.012, mat(0x3e6b4c));
        stem.rotation.z = 0.5;
        stem.position.set(0.02, 0.73, 0.15);
        addAcc(torsoPivot, stem);
        const bloom = box(0.05, 0.05, 0.05, mat(0xc0392b));
        bloom.position.set(0.07, 0.76, 0.16);
        addAcc(torsoPivot, bloom);
      } else if (id === "shades") {
        for (const sx of [-1, 1]) {
          const lens = box(0.07, 0.04, 0.02, mat(0x14100a));
          lens.position.set(sx * 0.06, 0.83, 0.13);
          addAcc(torsoPivot, lens);
        }
        const bridge = box(0.05, 0.02, 0.02, mat(0x14100a));
        bridge.position.set(0, 0.83, 0.13);
        addAcc(torsoPivot, bridge);
      } else if (id === "spectacles") {
        for (const sx of [-1, 1]) {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 12), mat(0xc8b06a));
          rim.position.set(sx * 0.06, 0.83, 0.135);
          addAcc(torsoPivot, rim);
        }
        const bridge = box(0.04, 0.008, 0.01, mat(0xc8b06a));
        bridge.position.set(0, 0.83, 0.135);
        addAcc(torsoPivot, bridge);
      } else if (id === "goggles") {
        for (const sx of [-1, 1]) {
          const lens = box(0.06, 0.05, 0.02, mat(0x6a8ab0));
          lens.position.set(sx * 0.06, 0.84, 0.13);
          addAcc(torsoPivot, lens);
        }
        const strap = box(0.28, 0.02, 0.02, mat(0x4a3018));
        strap.position.set(0, 0.86, 0.11);
        addAcc(torsoPivot, strap);
      } else if (id === "warstripe") {
        const band = box(0.26, 0.05, 0.02, mat(0x7a2a1e));
        band.position.set(0, 0.82, 0.125);
        addAcc(torsoPivot, band);
      } else if (id === "blindfold") {
        const band = box(0.27, 0.07, 0.03, mat(0x3a2a18));
        band.position.set(0, 0.83, 0.115);
        addAcc(torsoPivot, band);
      } else if (id === "deputybadge") {
        const badge = box(0.07, 0.08, 0.02, mat(0xaeb3b8));
        badge.position.set(0.15, 0.45, 0.15 + pZ);
        addAcc(torsoPivot, badge);
      } else if (id === "bolotie") {
        const cord = box(0.012, 0.14, 0.012, mat(0x2a1c10));
        cord.position.set(0, 0.55, 0.14 + pZ);
        addAcc(torsoPivot, cord);
        const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), mat(0xd8b13c));
        clasp.rotation.x = Math.PI / 2;
        clasp.position.set(0, 0.5, 0.15 + pZ);
        addAcc(torsoPivot, clasp);
      } else if (id === "pocketwatch") {
        const chain = box(0.01, 0.12, 0.01, mat(0xd8b13c));
        chain.rotation.z = 0.5;
        chain.position.set(0.06, 0.48, 0.15 + pZ);
        addAcc(torsoPivot, chain);
        const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.015, 12), mat(0xe8b64c));
        watch.rotation.x = Math.PI / 2;
        watch.position.set(0.12, 0.42, 0.15 + pZ);
        addAcc(torsoPivot, watch);
      } else if (id === "medallion") {
        const cord = box(0.012, 0.08, 0.012, mat(0x3a2a18));
        cord.position.set(0, 0.54, 0.14 + pZ);
        addAcc(torsoPivot, cord);
        const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 12), mat(0xe8b64c));
        pendant.rotation.x = Math.PI / 2;
        pendant.position.set(0, 0.48, 0.15 + pZ);
        addAcc(torsoPivot, pendant);
      } else if (id === "cape") {
        const part = box(0.54, 0.52, 0.05, mat(0x4a1c22));
        part.position.set(0, 0.34, -0.16);
        part.rotation.x = -0.05;
        addAcc(torsoPivot, part);
      } else if (id === "duster") {
        const part = box(0.5, 0.72, 0.05, mat(0x6b4a2a));
        part.position.set(0, 0.2, -0.16);
        addAcc(torsoPivot, part);
      } else if (id === "serape") {
        const cloth = box(0.5, 0.46, 0.05, mat(0xb8562e));
        cloth.position.set(0, 0.4, -0.15);
        addAcc(torsoPivot, cloth);
        const stripe = box(0.5, 0.05, 0.052, mat(0xe0d3a8));
        stripe.position.set(0, 0.45, -0.15);
        addAcc(torsoPivot, stripe);
      } else if (id === "bedroll") {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), mat(0x8a6a3c));
        roll.rotation.z = Math.PI / 2;
        roll.position.set(0, 0.62, -0.15);
        addAcc(torsoPivot, roll);
      } else if (id === "satchel") {
        const bag = box(0.18, 0.2, 0.1, mat(0x5c3a1e));
        bag.position.set(0.22, 0.34, -0.02);
        addAcc(torsoPivot, bag);
        const strap = box(0.05, 0.5, 0.03, mat(0x3a2412));
        strap.rotation.z = 0.5;
        strap.position.set(0.08, 0.5, 0.06);
        addAcc(torsoPivot, strap);
      } else if (id === "cardband") {
        const card = box(0.06, 0.09, 0.02, mat(0xf0ead8));
        card.position.set(0.1, 0.08, 0.14);
        addAcc(hat, card);
      } else if (id === "conchos") {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.172, 0.05, 12), mat(0x4a3018));
        band.position.y = 0.045;
        addAcc(hat, band);
        for (let ci = 0; ci < 3; ci++) {
          const stud = box(0.03, 0.03, 0.02, mat(0xaeb3b8));
          const a = ci * 0.5 - 0.5;
          stud.position.set(Math.sin(a) * 0.17, 0.045, Math.cos(a) * 0.17);
          addAcc(hat, stud);
        }
      } else if (id === "sheriffpin") {
        const star = makeStarMesh(0.035, 0.015, mat(0xe8b64c));
        star.position.set(0, 0.09, 0.16);
        addAcc(hat, star);
      } else if (id === "bulletband") {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.172, 0.05, 12), mat(0x4a3018));
        band.position.y = 0.045;
        addAcc(hat, band);
        for (let bi = 0; bi < 3; bi++) {
          const bullet = box(0.02, 0.05, 0.02, mat(0xd8b13c));
          const a = bi * 0.45 - 0.45;
          bullet.position.set(Math.sin(a) * 0.17, 0.05, Math.cos(a) * 0.17);
          addAcc(hat, bullet);
        }
      } else if (id === "snakeband") {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.172, 0.055, 12), mat(0x3e6b4c));
        band.position.y = 0.045;
        addAcc(hat, band);
      } else if (seasonBadgeInfo(id) !== null) {
        const info = seasonBadgeInfo(id);
        const ribbon = box(0.05, 0.06, 0.02, mat(0xa83c2a));
        ribbon.position.set(0.15, 0.5, 0.14 + pZ);
        addAcc(torsoPivot, ribbon);
        const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 12), mat(0xe8b64c));
        medal.rotation.x = Math.PI / 2;
        medal.position.set(0.15, 0.42, 0.15 + pZ);
        addAcc(torsoPivot, medal);
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const c2 = canvas.getContext("2d");
        c2.fillStyle = "#5a3410";
        c2.font = "bold 34px 'Rye', serif";
        c2.textAlign = "center";
        c2.textBaseline = "middle";
        c2.fillText(String(info.rank), 32, 24);
        c2.font = "bold 17px 'Special Elite', serif";
        c2.fillText("S" + info.season, 32, 49);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const num = new THREE.Mesh(
          new THREE.PlaneGeometry(0.09, 0.09),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        );
        num.position.set(0.15, 0.42, 0.162 + pZ);
        addAcc(torsoPivot, num);
      }
    }
  }

  function setDrawn(drawn) {
    anim.drawn = drawn;
    handGun.visible = drawn;
    holsterGun.visible = !drawn;
  }

  function reset() {
    anim.armTarget = 0;
    anim.armCurrent = 0;
    anim.dodgeTarget = 0;
    anim.dodgeCurrent = 0;
    anim.death = null;
    anim.flinch = 0;
    anim.wounded = false;
    anim.walk = false;
    anim.walkPhase = 0;
    anim.talk = false;
    anim.dig = false;
    shovel.visible = false;
    anim.seated = false;
    setDrawn(false);
    group.rotation.set(0, 0, 0);
    group.position.x = 0;
    group.position.y = 0;
    torsoPivot.rotation.set(0, 0, 0);
    torsoPivot.position.y = 0.86;
    armR.shoulder.rotation.set(0, 0, 0);
    armR.elbow.rotation.set(0, 0, 0);
    armL.shoulder.rotation.set(0, 0, 0);
    armL.elbow.rotation.set(0, 0, 0);
    legL.hip.rotation.set(0, 0, 0);
    legL.knee.rotation.set(0, 0, 0);
    legR.hip.rotation.set(0, 0, 0);
    legR.knee.rotation.set(0, 0, 0);
    flash.visible = false;
    flashLight.intensity = 0;
    if (anim.hatFlying) {
      anim.hatFlying = false;
      torsoPivot.add(hat);
      hat.position.set(0, 0.925, 0);
      hat.rotation.set(0, 0, 0);
      anim.hatVel.set(0, 0, 0);
      anim.hatSpin.set(0, 0, 0);
    }
  }

  function playDraw() {
    anim.armTarget = -Math.PI / 2;
    setDrawn(true);
  }

  function playHolster() {
    anim.armTarget = 0;
    setDrawn(false);
  }

  function holdGun(active) {
    anim.armTarget = active ? -1.15 : 0;
    setDrawn(active);
  }

  function setTalk(active) {
    anim.talk = active;
  }

  function setDig(active) {
    anim.dig = active;
    shovel.visible = active;
  }

  function setSeated(active) {
    anim.seated = !!active;
    anim.seatFloor = active === "floor";
  }

  function playShoot() {
    setDrawn(true);
    anim.flashUntil = anim.time + 0.16;
    flash.visible = true;
    flashLight.intensity = 14;
    anim.armCurrent = -Math.PI / 2 - 0.35;
  }

  function playReload() {
    anim.armTarget = -Math.PI / 4;
  }

  function playDodge(dir) {
    anim.dodgeTarget = Math.max(-2.6, Math.min(2.6, anim.dodgeTarget + dir * 1.5));
  }

  function setWalk(active) {
    anim.walk = active;
  }

  function playFlinch() {
    anim.flinch = 0.35;
  }

  function setWounded() {
    anim.wounded = true;
  }

  function flyHat(sceneRef, velocity) {
    if (anim.hatFlying) {
      return;
    }
    anim.hatFlying = true;
    const worldPos = new THREE.Vector3();
    hat.getWorldPosition(worldPos);
    torsoPivot.remove(hat);
    sceneRef.add(hat);
    hat.position.copy(worldPos);
    anim.hatVel.copy(velocity);
    anim.hatSpin.set(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3);
  }

  function playDeath(sceneRef, rest, back) {
    anim.death = { t: 0, rest: rest === undefined ? -0.32 : rest, dir: back ? 1 : -1 };
    flyHat(sceneRef, new THREE.Vector3((Math.random() - 0.5) * 2, 3.2, -1.6));
  }

  function playHatShot(sceneRef) {
    flyHat(sceneRef, new THREE.Vector3((Math.random() - 0.5) * 3, 4.5, -2.5));
    playFlinch();
  }

  function isHatGone() {
    return anim.hatFlying;
  }

  function isDown() {
    return anim.death !== null;
  }

  function update(dt) {
    anim.time += dt;

    const lerpSpeed = 14;
    anim.armCurrent += (anim.armTarget - anim.armCurrent) * Math.min(1, dt * lerpSpeed);
    armR.shoulder.rotation.x = anim.armCurrent;
    let elbowBend = 0;
    if (anim.armCurrent < -0.3) {
      elbowBend = -0.14;
    }
    armR.elbow.rotation.x += (elbowBend - armR.elbow.rotation.x) * Math.min(1, dt * lerpSpeed);

    if (anim.death === null) {
      const breath = Math.sin(anim.time * 1.6) * 0.008;
      let bob = breath;
      if (anim.walk) {
        bob = Math.abs(Math.sin(anim.walkPhase)) * 0.05 - 0.025;
      }
      torsoPivot.position.y = 0.86 + bob;
      let lean = 0;
      if (anim.wounded) {
        lean = 0.22;
      }
      let flinchLean = 0;
      if (anim.flinch > 0) {
        anim.flinch -= dt;
        flinchLean = Math.sin(anim.flinch * 12) * 0.3;
      }
      let seatLean = 0;
      if (anim.seated && anim.seatFloor) {
        seatLean = -0.45;
      }
      torsoPivot.rotation.z = lean * 0.4;
      torsoPivot.rotation.x = -flinchLean + seatLean;

      const step = (anim.dodgeTarget - anim.dodgeCurrent) * Math.min(1, dt * 8);
      anim.dodgeCurrent += step;
      group.position.x += step;
      group.rotation.z = (anim.dodgeTarget - anim.dodgeCurrent) * 0.16;
    }

    if (anim.walk && anim.death === null) {
      anim.walkPhase += dt * 6.4;
      const swing = Math.sin(anim.walkPhase);
      legL.hip.rotation.x = swing * 0.62;
      legR.hip.rotation.x = -swing * 0.62;
      legL.knee.rotation.x = Math.max(0, Math.sin(anim.walkPhase + Math.PI * 0.5)) * 0.85;
      legR.knee.rotation.x = Math.max(0, Math.sin(anim.walkPhase + Math.PI * 1.5)) * 0.85;
      armL.shoulder.rotation.x = -swing * 0.45;
      armL.elbow.rotation.x = -0.3 - Math.max(0, swing) * 0.25;
      if (!anim.drawn && anim.armTarget === 0) {
        armR.shoulder.rotation.x = swing * 0.45;
        armR.elbow.rotation.x = -0.3 - Math.max(0, -swing) * 0.25;
      }
      torsoPivot.rotation.y = Math.sin(anim.walkPhase) * 0.06;
    } else if (anim.death === null) {
      let hipRest = 0;
      let kneeRest = 0;
      if (anim.seated && anim.seatFloor) {
        hipRest = -1.5;
        kneeRest = 0.4;
      } else if (anim.seated) {
        hipRest = -1.45;
        kneeRest = 1.5;
      } else if (anim.dig) {
        hipRest = -0.28;
        kneeRest = 0.42;
      }
      legL.hip.rotation.x += (hipRest - legL.hip.rotation.x) * Math.min(1, dt * 10);
      legR.hip.rotation.x += (hipRest - legR.hip.rotation.x) * Math.min(1, dt * 10);
      legL.knee.rotation.x += (kneeRest - legL.knee.rotation.x) * Math.min(1, dt * 10);
      legR.knee.rotation.x += (kneeRest - legR.knee.rotation.x) * Math.min(1, dt * 10);
      if (!anim.talk) {
        armL.shoulder.rotation.x += (Math.sin(anim.time * 1.6) * 0.03 - armL.shoulder.rotation.x) * Math.min(1, dt * 8);
        armL.elbow.rotation.x += (-0.08 - armL.elbow.rotation.x) * Math.min(1, dt * 8);
      }
      const wander = Math.sin(anim.time * 0.33 + anim.idleSeed) * 0.06 + Math.sin(anim.time * 0.81 + anim.idleSeed * 2) * 0.02;
      torsoPivot.rotation.y += (wander - torsoPivot.rotation.y) * Math.min(1, dt * 5);
    }

    if (anim.death === null && !anim.walk && !anim.drawn && anim.armTarget === 0) {
      if (anim.dig) {
        const dtt = anim.time * 3.4 + anim.digSeed;
        const cycle = (Math.sin(dtt) + 1) / 2;
        armR.shoulder.rotation.x = -0.35 - cycle * 0.75;
        armR.elbow.rotation.x = -0.15 - cycle * 0.3;
        armL.shoulder.rotation.x = -0.5 - cycle * 0.6;
        armL.elbow.rotation.x = -0.45 - cycle * 0.2;
        torsoPivot.rotation.x = 0.16 + cycle * 0.22;
        torsoPivot.rotation.y = Math.sin(dtt * 0.5) * 0.06;
      } else if (anim.talk) {
        const tt = anim.time + anim.talkSeed;
        armR.shoulder.rotation.x = -0.55 + Math.sin(tt * 3.2) * 0.28 + Math.sin(tt * 5.1) * 0.12;
        armR.elbow.rotation.x = -0.55 + Math.sin(tt * 4.3 + 0.6) * 0.3;
        armL.shoulder.rotation.x = -0.35 + Math.sin(tt * 2.6 + 1.9) * 0.22;
        armL.elbow.rotation.x = -0.4 + Math.sin(tt * 3.4 + 0.8) * 0.24;
        torsoPivot.rotation.x = Math.sin(tt * 2.8) * 0.02;
      } else if (anim.seated) {
        const shoulderRest = anim.seatFloor ? 0.7 : -0.5;
        const elbowRest = anim.seatFloor ? -0.2 : -0.45;
        armR.shoulder.rotation.x += (shoulderRest - armR.shoulder.rotation.x) * Math.min(1, dt * 8);
        armR.elbow.rotation.x += (elbowRest - armR.elbow.rotation.x) * Math.min(1, dt * 8);
        armL.shoulder.rotation.x += (shoulderRest - armL.shoulder.rotation.x) * Math.min(1, dt * 8);
        armL.elbow.rotation.x += (elbowRest - armL.elbow.rotation.x) * Math.min(1, dt * 8);
      }
    }

    if (anim.death !== null) {
      anim.death.t += dt;
      const t = Math.min(1, anim.death.t / 0.85);
      const buckle = Math.min(1, anim.death.t / 0.3);
      legL.knee.rotation.x = buckle * 1.3;
      legR.knee.rotation.x = buckle * 1.1;
      group.position.y = anim.death.rest * buckle;
      const fall = Math.max(0, (anim.death.t - 0.12) / 0.73);
      const eased = Math.min(1, fall * fall);
      group.rotation.x = anim.death.dir * Math.PI / 2 * eased;
      armR.shoulder.rotation.x += (0.4 - armR.shoulder.rotation.x) * Math.min(1, dt * 4);
      armL.shoulder.rotation.x += (0.3 - armL.shoulder.rotation.x) * Math.min(1, dt * 4);
    }

    if (anim.hatFlying) {
      anim.hatVel.y -= 9.8 * dt;
      hat.position.addScaledVector(anim.hatVel, dt);
      hat.rotation.x += anim.hatSpin.x * dt;
      hat.rotation.y += anim.hatSpin.y * dt;
      hat.rotation.z += anim.hatSpin.z * dt;
      if (hat.position.y < 0.05) {
        hat.position.y = 0.05;
        anim.hatVel.set(0, 0, 0);
        anim.hatSpin.set(0, 0, 0);
      }
    }

    if (flash.visible && anim.time > anim.flashUntil) {
      flash.visible = false;
      flashLight.intensity = 0;
    }
  }

  return {
    group: group,
    head: head,
    gun: handGun,
    hitMeshes: hitMeshes,
    setSkin: setSkin,
    setWeapon: setWeapon,
    setAccessories: setAccessories,
    reset: reset,
    playDraw: playDraw,
    playHolster: playHolster,
    holdGun: holdGun,
    playShoot: playShoot,
    playReload: playReload,
    playDodge: playDodge,
    setWalk: setWalk,
    setTalk: setTalk,
    setDig: setDig,
    setSeated: setSeated,
    playFlinch: playFlinch,
    playDeath: playDeath,
    playHatShot: playHatShot,
    isHatGone: isHatGone,
    setWounded: setWounded,
    isDown: isDown,
    update: update
  };
}
