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

export function makePentagonMesh(outer, depth, material) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) {
      shape.moveTo(Math.cos(a) * outer, -Math.sin(a) * outer);
    } else {
      shape.lineTo(Math.cos(a) * outer, -Math.sin(a) * outer);
    }
  }
  shape.closePath();
  const hole = new THREE.Path();
  const hs = outer * 0.15;
  hole.moveTo(-hs, -hs);
  hole.lineTo(hs, -hs);
  hole.lineTo(hs, hs);
  hole.lineTo(-hs, hs);
  hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geo, material);
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
  const holsterPocket = box(0.1, 0.30, 0.2, darkLeather);
  holsterPocket.rotation.z = 0.12;
  holsterPocket.rotation.x = 0.05;
  holsterPocket.position.set(0, -0.06, -0.02);
  holster.add(holsterPocket);
  holster.position.set(-0.28, -0.08, 0.02);
  torsoPivot.add(holster);

  const holsterGun = createRevolver(gunMats, false);
  const hBarrel = holsterGun.getObjectByName("barrelGroup");
  if (hBarrel) { hBarrel.scale.z = 0.001; }
  holsterGun.scale.setScalar(1.35);
  holsterGun.rotation.set(-Math.PI / 2 + 0.05, 0, Math.PI + 0.12);
  holsterGun.position.set(-0.29, 0.04, 0.02);
  torsoPivot.add(holsterGun);

  const handGun = createRevolver(gunMats, false);
  handGun.scale.setScalar(1.35);
  handGun.rotation.set(-Math.PI / 2, 0, Math.PI);
  handGun.position.set(0, -0.34, 0.02);
  handGun.visible = false;
  armR.elbow.add(handGun);

  const handGunL = createRevolver(gunMats, false);
  handGunL.scale.setScalar(1.35);
  handGunL.rotation.set(-Math.PI / 2, 0, Math.PI);
  handGunL.position.set(0, -0.34, 0.02);
  handGunL.visible = false;
  armL.elbow.add(handGunL);

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

  const flashL = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.44, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 1 })
  );
  flashL.rotation.x = Math.PI;
  flashL.position.set(0, -0.76, -0.03);
  flashL.visible = false;
  armL.elbow.add(flashL);
  const flashLightL = new THREE.PointLight(0xffc26b, 0, 8);
  flashLightL.position.set(0, -0.74, -0.03);
  armL.elbow.add(flashLightL);

  head.userData.part = "head";
  nose.userData.part = "head";
  hat.traverse(function (child) {
    child.userData.part = "hat";
  });
  const bodyParts = [bandana, torso, shoulders, belt, legL.thigh, legL.shin, legR.thigh, legR.shin, armL.upper, armL.forearm, armR.upper, armR.forearm];
  for (const part of bodyParts) {
    part.userData.part = "body";
  }

  hitMeshes.push(head, nose, brim, crown, bandana, torso, shoulders, belt, legL.thigh, legL.shin, legR.thigh, legR.shin, armL.upper, armL.forearm, armR.upper, armR.forearm);

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
    unarmed: false,
    leftHanded: false,
    leanZ: 0,
    holsterHand: false,
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
    hat.visible = true;
  }

  function addAcc(parent, mesh) {
    parent.add(mesh);
    accParts.push(mesh);
  }

  const outfitParts = [];
  let outfitFront = 0;
  let currentAccList = [];

  function clearOutfit() {
    for (const part of outfitParts) {
      part.parent.remove(part);
    }
    outfitParts.length = 0;
  }

  function addFit(parent, mesh) {
    parent.add(mesh);
    outfitParts.push(mesh);
  }

  function fitSleeves(material) {
    for (const arm of [armL, armR]) {
      const sleeve = box(0.125, 0.305, 0.125, material);
      sleeve.position.y = -0.15;
      addFit(arm.shoulder, sleeve);
    }
  }

  function fitTorso(material) {
    const over = box(0.51, 0.54, 0.27, material);
    over.position.y = 0.33;
    addFit(torsoPivot, over);
    const shoulderOver = box(0.57, 0.14, 0.285, material);
    shoulderOver.position.y = 0.55;
    addFit(torsoPivot, shoulderOver);
  }

  function fitLongCoat(material) {
    fitTorso(material);
    fitSleeves(material);
      for (const sx of [-1, 1]) {
      const flap = box(0.15, 0.6, 0.04, material);
      flap.position.set(sx * 0.175, -0.24, 0.11);
      addFit(torsoPivot, flap);
      const sideFlap = box(0.04, 0.6, 0.18, material);
      sideFlap.position.set(sx * 0.23, -0.24, 0);
      addFit(torsoPivot, sideFlap);
    }
    const backFlap = box(0.5, 0.6, 0.04, material);
    backFlap.position.set(0, -0.24, -0.11);
    addFit(torsoPivot, backFlap);
    const collar = box(0.3, 0.07, 0.3, material);
    collar.position.y = 0.585;
    addFit(torsoPivot, collar);
  }

  function setOutfit(outfit) {
    clearOutfit();
    outfitFront = 0;
    buckle.visible = true;
    belt.visible = true;
    if (!outfit || !outfit.kind) {
      setAccessories(currentAccList);
      return;
    }
    const kind = outfit.kind;
    if (kind === "furcoat" || kind === "suit" || kind === "cassock" || kind === "tailcoat" || kind === "shroud" || kind === "dress" || kind === "tatters" || kind === "bones") buckle.visible = false;
    if (kind === "cassock" || kind === "tailcoat" || kind === "bones") belt.visible = false;
      if (kind === "poncho") outfitFront = 0.04;
      else if (kind === "serape") outfitFront = 0.05;
      else if (kind === "tatters") outfitFront = 0.05;
      else if (kind === "vest") outfitFront = 0.03;
      else if (kind === "suspenders") outfitFront = 0.02;
      else if (kind === "suit") outfitFront = 0.025;
      else if (kind === "overalls") outfitFront = 0.038;
      else if (kind === "furcoat") outfitFront = 0.025;
      else if (kind === "frock") outfitFront = 0.025;
      else if (kind === "cavalry") outfitFront = 0.04;
      else if (kind === "fringe") outfitFront = 0.04;
      else if (kind === "bones") outfitFront = 0.03;
      else if (kind === "bolero") outfitFront = 0.04;
      else if (kind === "dress") outfitFront = 0.02;
      else if (kind === "cloak") outfitFront = 0.02;
      else if (kind === "duster") outfitFront = 0.02;
      else if (kind === "greatcoat") outfitFront = 0.02;
      else if (kind === "crossstrap") outfitFront = 0.035;
      else if (kind === "cassock") outfitFront = 0.025;
      else if (kind === "tailcoat") outfitFront = 0.03;
      else if (kind === "shroud") outfitFront = 0.045;
      else outfitFront = 0.01;
      
      setAccessories(currentAccList);
      
      const c1 = mat(outfit.c1 !== undefined ? outfit.c1 : 0x3a2a18);
    const c2 = mat(outfit.c2 !== undefined ? outfit.c2 : 0xd8b13c);
    const c3 = mat(outfit.c3 !== undefined ? outfit.c3 : 0xd8b13c);
    if (kind === "suspenders") {
      for (const sx of [-1, 1]) {
        const front = box(0.06, 0.54, 0.02, c1);
        front.position.set(sx * 0.13, 0.34, 0.14);
        addFit(torsoPivot, front);
        const back = box(0.06, 0.54, 0.02, c1);
        back.position.set(sx * 0.13, 0.34, -0.14);
        addFit(torsoPivot, back);
        const top = box(0.06, 0.02, 0.3, c1);
        top.position.set(sx * 0.13, 0.61, 0);
        addFit(torsoPivot, top);
        const clip = box(0.07, 0.04, 0.025, mat(0xb8b8c0));
        clip.position.set(sx * 0.13, 0.09, 0.145);
        addFit(torsoPivot, clip);
      }
    } else if (kind === "vest") {
      for (const sx of [-1, 1]) {
        const panel = box(0.18, 0.54, 0.035, c1);
        panel.position.set(sx * 0.17, 0.35, 0.1375);
        addFit(torsoPivot, panel);
        const side = box(0.035, 0.54, 0.275, c1);
        side.position.set(sx * 0.2625, 0.35, 0);
        addFit(torsoPivot, side);
      }
      const back = box(0.53, 0.54, 0.03, c1);
      back.position.set(0, 0.35, -0.14);
      addFit(torsoPivot, back);
      for (const sx of [-1, 1]) {
        const shoulderOver = box(0.21, 0.14, 0.285, c1);
        shoulderOver.position.set(sx * 0.185, 0.55, 0);
        addFit(torsoPivot, shoulderOver);
      }
      for (const by of [0.2, 0.3, 0.4]) {
        const btn = box(0.03, 0.03, 0.02, c2);
        btn.position.set(-0.1, by, 0.157);
        addFit(torsoPivot, btn);
      }
    } else if (kind === "crossstrap") {
      for (const dir of [-1, 1]) {
        const strap = box(0.1, 0.68, 0.03, c1);
        strap.rotation.z = dir * 0.65;
        strap.position.set(0, 0.32, 0.145);
        addFit(torsoPivot, strap);
        const strapBack = box(0.1, 0.68, 0.03, c1);
        strapBack.rotation.z = -dir * 0.65;
        strapBack.position.set(0, 0.32, -0.145);
        addFit(torsoPivot, strapBack);
        for (let bi = 0; bi < 3; bi++) {
          const bullet = box(0.025, 0.055, 0.02, c2);
          bullet.position.set(dir * (-0.14 + bi * 0.14), 0.44 - bi * 0.11, 0.165);
          addFit(torsoPivot, bullet);
        }
      }
      const buckle = box(0.08, 0.08, 0.035, c2);
      buckle.position.set(0, 0.32, 0.15);
      addFit(torsoPivot, buckle);
    } else if (kind === "poncho") {
      const front = box(0.5, 0.52, 0.04, c1);
      front.rotation.x = 0.05;
      front.position.set(0, 0.34, 0.14);
      addFit(torsoPivot, front);
      const back = box(0.5, 0.52, 0.04, c1);
      back.rotation.x = -0.05;
      back.position.set(0, 0.34, -0.14);
      addFit(torsoPivot, back);
      const stripeF = box(0.5, 0.09, 0.046, c2);
      stripeF.rotation.x = 0.05;
      stripeF.position.set(0, 0.28, 0.142);
      addFit(torsoPivot, stripeF);
      const stripeB = box(0.5, 0.09, 0.046, c2);
      stripeB.rotation.x = -0.05;
      stripeB.position.set(0, 0.28, -0.142);
      addFit(torsoPivot, stripeB);
      for (const sx of [-1, 1]) {
        const drape = box(0.045, 0.44, 0.3, c1);
        drape.position.set(sx * 0.24, 0.36, 0);
        addFit(torsoPivot, drape);
      }
    } else if (kind === "cavalry") {
      fitTorso(c1);
      fitSleeves(c1);
      const bib = box(0.24, 0.38, 0.005, c1);
      bib.position.set(0, 0.36, 0.138);
      addFit(torsoPivot, bib);
      for (let row = 0; row < 3; row++) {
        for (const sx of [-1, 1]) {
          const btn = box(0.032, 0.032, 0.02, c2);
          btn.position.set(sx * 0.07, 0.24 + row * 0.1, 0.15);
          addFit(torsoPivot, btn);
        }
      }
      for (const sx of [-1, 1]) {
        const board = box(0.15, 0.035, 0.13, c2);
        board.position.set(sx * 0.3, 0.62, 0);
        addFit(torsoPivot, board);
      }
      for (const arm of [armL, armR]) {
        const cuff = box(0.13, 0.06, 0.13, c2);
        cuff.position.y = -0.25;
        addFit(arm.elbow, cuff);
      }
    } else if (kind === "duster") {
      fitLongCoat(c1);
    } else if (kind === "greatcoat") {
      fitLongCoat(c1);
      const cape = box(0.565, 0.2, 0.28, c1);
      cape.position.set(0, 0.5, 0);
      addFit(torsoPivot, cape);
    } else if (kind === "frock") {
      fitLongCoat(c1);
      const front = box(0.14, 0.42, 0.005, c2);
      front.position.set(0, 0.38, 0.138);
      addFit(torsoPivot, front);
    } else if (kind === "tatters") {
      const front = box(0.6, 0.42, 0.05, c1);
      front.position.set(0, 0.38, 0.15);
      addFit(torsoPivot, front);
      const back = box(0.6, 0.42, 0.05, c1);
      back.position.set(0, 0.38, -0.15);
      addFit(torsoPivot, back);
      for (let i = 0; i < 5; i++) {
        const lenF = 0.14 + ((i * 7) % 3) * 0.05;
        const stripF = box(0.09, lenF, 0.05, c1);
        stripF.position.set(-0.24 + i * 0.12, 0.17 - lenF / 2 + 0.07, 0.15);
        addFit(torsoPivot, stripF);
        const lenB = 0.14 + ((i * 5) % 3) * 0.05;
        const stripB = box(0.09, lenB, 0.05, c1);
        stripB.position.set(-0.24 + i * 0.12, 0.17 - lenB / 2 + 0.07, -0.15);
        addFit(torsoPivot, stripB);
      }
    } else if (kind === "suit") {
      fitTorso(c1);
      fitSleeves(c1);
      const shirtFront = box(0.2, 0.3, 0.005, c2);
      shirtFront.position.set(0, 0.42, 0.143);
      addFit(torsoPivot, shirtFront);
      for (const sx of [-1, 1]) {
        const lapel = box(0.16, 0.44, 0.018, c1);
        lapel.rotation.z = -sx * 0.38;
        lapel.position.set(sx * 0.095, 0.38, 0.142);
        addFit(torsoPivot, lapel);
      }
      const bow = box(0.12, 0.045, 0.01, c3);
      bow.position.set(0, 0.545, 0.155);
      addFit(torsoPivot, bow);
      const knot = box(0.035, 0.055, 0.015, c3);
      knot.position.set(0, 0.545, 0.168);
      addFit(torsoPivot, knot);
      for (const by of [0.16, 0.26, 0.36]) {
        const btn = box(0.03, 0.03, 0.01, c3);
        btn.position.set(0, by, 0.153);
        addFit(torsoPivot, btn);
      }
    } else if (kind === "bolero") {
      const jacket = box(0.505, 0.32, 0.265, c1);
      jacket.position.set(0, 0.46, 0);
      addFit(torsoPivot, jacket);
      const shoulderOver = box(0.565, 0.13, 0.275, c1);
      shoulderOver.position.y = 0.55;
      addFit(torsoPivot, shoulderOver);
      fitSleeves(c1);
      const sash = box(0.53, 0.13, 0.29, c2);
      sash.position.set(0, 0.08, 0);
      addFit(torsoPivot, sash);
      const sashTail = box(0.1, 0.22, 0.03, c2);
      sashTail.position.set(0.14, -0.06, 0.14);
      addFit(torsoPivot, sashTail);
      for (const sx of [-1, 1]) {
        const trim = box(0.03, 0.3, 0.025, c3);
        trim.position.set(sx * 0.09, 0.45, 0.155);
        addFit(torsoPivot, trim);
      }
    } else if (kind === "overalls") {
      const bib = box(0.3, 0.32, 0.025, c1);
      bib.position.set(0, 0.37, 0.148);
      addFit(torsoPivot, bib);
      const waist = box(0.505, 0.22, 0.265, c1);
      waist.position.set(0, 0.1, 0);
      addFit(torsoPivot, waist);
      for (const sx of [-1, 1]) {
        const strap = box(0.07, 0.16, 0.02, c1);
        strap.position.set(sx * 0.11, 0.53, 0.148);
        addFit(torsoPivot, strap);
        const top = box(0.07, 0.02, 0.3, c1);
        top.position.set(sx * 0.11, 0.61, 0);
        addFit(torsoPivot, top);
        const backStrap = box(0.07, 0.40, 0.02, c1);
        backStrap.position.set(sx * 0.11, 0.41, -0.145);
        addFit(torsoPivot, backStrap);
        const btn = box(0.035, 0.035, 0.02, c2);
        btn.position.set(sx * 0.12, 0.51, 0.162);
        addFit(torsoPivot, btn);
      }
    } else if (kind === "fringe") {
      fitTorso(c1);
      fitSleeves(c1);
      for (let i = 0; i < 6; i++) {
        const f = box(0.05, 0.1, 0.02, c2);
        f.position.set(-0.2 + i * 0.08, 0.28, 0.155);
        addFit(torsoPivot, f);
        const fb = box(0.05, 0.1, 0.02, c2);
        fb.position.set(-0.2 + i * 0.08, 0.28, -0.155);
        addFit(torsoPivot, fb);
      }
      for (const arm of [armL, armR]) {
        const af = box(0.16, 0.09, 0.16, c2);
        af.position.y = -0.02;
        addFit(arm.shoulder, af);
      }
    } else if (kind === "dress") {
      const corset = box(0.505, 0.4, 0.265, c1);
      corset.position.set(0, 0.22, 0);
      addFit(torsoPivot, corset);
      const lace = box(0.22, 0.05, 0.24, c3);
      lace.position.set(0, 0.575, 0);
      addFit(torsoPivot, lace);
      for (const sx of [-1, 1]) {
        const puff = box(0.16, 0.14, 0.16, c1);
        puff.position.set(sx * 0.33, 0.52, 0);
        addFit(torsoPivot, puff);
      }
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 0.85, 10), c2);
      skirt.castShadow = true;
      skirt.position.y = 0.44;
      addFit(group, skirt);
    } else if (kind === "cloak") {
      const back = box(0.52, 0.95, 0.05, c1);
      back.position.set(0, -0.1, -0.14);
      addFit(torsoPivot, back);
      const hair = box(0.32, 0.3, 0.05, mat(0x2c1c10));
      hair.position.set(0, -0.145, -0.145);
      addFit(hat, hair);
      const shoulderOver = box(0.565, 0.12, 0.275, c1);
      shoulderOver.position.set(0, 0.56, 0);
      addFit(torsoPivot, shoulderOver);
      const clasp = box(0.1, 0.04, 0.03, c2);
      clasp.position.set(0, 0.56, 0.14);
      addFit(torsoPivot, clasp);
    } else if (kind === "furcoat") {
      fitLongCoat(c1);
      const midSkirt = box(0.2, 0.6, 0.04, c1);
      midSkirt.position.set(0, -0.24, 0.11);
      addFit(torsoPivot, midSkirt);
      const collar = box(0.5, 0.16, 0.28, c2);
      collar.position.set(0, 0.56, 0);
      addFit(torsoPivot, collar);
      for (const arm of [armL, armR]) {
        const cuff = box(0.16, 0.1, 0.16, c2);
        cuff.position.y = -0.26;
        addFit(arm.elbow, cuff);
      }
      const trim = box(0.52, 0.08, 0.28, c2);
      trim.position.y = -0.52;
      addFit(torsoPivot, trim);
    } else if (kind === "bones") {
      const hips = box(0.5, 0.18, 0.26, c1);
      hips.position.set(0, -0.02, 0);
      addFit(torsoPivot, hips);
      const spine = box(0.06, 0.5, 0.02, c2);
      spine.position.set(0, 0.3, 0.145);
      addFit(torsoPivot, spine);
      for (let i = 0; i < 4; i++) {
        const rib = box(0.34 - i * 0.03, 0.05, 0.02, c2);
        rib.position.set(0, 0.46 - i * 0.1, 0.146);
        addFit(torsoPivot, rib);
      }
      const pelvis = box(0.3, 0.1, 0.02, c2);
      pelvis.position.set(0, 0.05, 0.146);
      addFit(torsoPivot, pelvis);
      for (const arm of [armL, armR]) {
        const upperBone = box(0.05, 0.28, 0.05, c2);
        upperBone.position.set(0, -0.15, 0.07);
        addFit(arm.shoulder, upperBone);
        const foreBone = box(0.045, 0.24, 0.045, c2);
        foreBone.position.set(0, -0.13, 0.06);
        addFit(arm.elbow, foreBone);
      }
      for (const leg of [legL, legR]) {
        const thighBone = box(0.06, 0.36, 0.06, c2);
        thighBone.position.set(0, -0.19, 0.11);
        addFit(leg.hip, thighBone);
        const shinBone = box(0.05, 0.32, 0.05, c2);
        shinBone.position.set(0, -0.18, 0.09);
        addFit(leg.knee, shinBone);
      }
    } else if (kind === "serape") {
      const front = box(0.72, 0.18, 0.05, c1);
      front.rotation.z = 0.6;
      front.position.set(0, 0.34, 0.15);
      addFit(torsoPivot, front);
      const stripeF = box(0.72, 0.05, 0.054, c2);
      stripeF.rotation.z = 0.6;
      stripeF.position.set(0.03, 0.38, 0.152);
      addFit(torsoPivot, stripeF);
      const back = box(0.72, 0.18, 0.05, c1);
      back.rotation.z = 0.6;
      back.position.set(0, 0.34, -0.15);
      addFit(torsoPivot, back);
      const stripeB = box(0.72, 0.05, 0.054, c2);
      stripeB.rotation.z = 0.6;
      stripeB.position.set(0.03, 0.38, -0.152);
      addFit(torsoPivot, stripeB);
      const roll = box(0.2, 0.1, 0.34, c1);
      roll.position.set(0.28, 0.6, 0);
      addFit(torsoPivot, roll);
    } else if (kind === "cassock") {
      fitTorso(c1);
      fitSleeves(c1);
      const waist = box(0.5, 0.1, 0.26, c1);
      waist.position.y = 0.01;
      addFit(torsoPivot, waist);
      for (const sx of [-1, 1]) {
        const flap = box(0.16, 0.62, 0.04, c1);
        flap.position.set(sx * 0.17, -0.25, 0.11);
        addFit(torsoPivot, flap);
        const sideFlap = box(0.04, 0.62, 0.2, c1);
        sideFlap.position.set(sx * 0.24, -0.25, 0);
        addFit(torsoPivot, sideFlap);
      }
      const backFlap = box(0.5, 0.62, 0.04, c1);
      backFlap.position.set(0, -0.25, -0.11);
      addFit(torsoPivot, backFlap);
      const collar = box(0.26, 0.09, 0.28, c2);
      collar.position.y = 0.585;
      addFit(torsoPivot, collar);
      const tab = box(0.05, 0.09, 0.02, c2);
      tab.position.set(0, 0.55, 0.146);
      addFit(torsoPivot, tab);
      const sash = box(0.53, 0.07, 0.29, c3);
      sash.position.set(0, 0.06, 0);
      addFit(torsoPivot, sash);
    } else if (kind === "tailcoat") {
      fitTorso(c1);
      fitSleeves(c1);
      const waist = box(0.5, 0.1, 0.26, c1);
      waist.position.y = 0.01;
      addFit(torsoPivot, waist);
      const vest = box(0.26, 0.48, 0.02, c2);
      vest.position.set(0, 0.33, 0.142);
      addFit(torsoPivot, vest);
      for (let bi = 0; bi < 4; bi++) {
        const btn = box(0.035, 0.035, 0.02, c3);
        btn.position.set(0, 0.4 - bi * 0.08, 0.155);
        addFit(torsoPivot, btn);
      }
      const collar = box(0.3, 0.08, 0.29, c2);
      collar.position.y = 0.585;
      addFit(torsoPivot, collar);
      const bow = box(0.12, 0.045, 0.01, c3);
      bow.position.set(0, 0.545, 0.158);
      addFit(torsoPivot, bow);
      const knot = box(0.035, 0.055, 0.015, c3);
      knot.position.set(0, 0.545, 0.165);
      addFit(torsoPivot, knot);
      const band = box(0.55, 0.13, 0.3, c3);
      band.position.y = 0.02;
      addFit(torsoPivot, band);
      const buckle = box(0.1, 0.08, 0.02, c2);
      buckle.position.set(0, 0.02, 0.155);
      addFit(torsoPivot, buckle);
    } else if (kind === "shroud") {
      const back = box(0.52, 0.98, 0.05, c1);
      back.position.set(0, -0.12, -0.14);
      addFit(torsoPivot, back);
      for (const sx of [-1, 1]) {
        const drape = box(0.06, 0.66, 0.3, c1);
        drape.position.set(sx * 0.25, 0.16, -0.02);
        addFit(torsoPivot, drape);
        const trim = box(0.05, 0.5, 0.03, c2);
        trim.rotation.z = sx * 0.05;
        trim.position.set(sx * 0.12, 0.3, 0.145);
        addFit(torsoPivot, trim);
      }
      const shoulderOver = box(0.565, 0.13, 0.29, c1);
      shoulderOver.position.set(0, 0.55, 0);
      addFit(torsoPivot, shoulderOver);
      const clasp = box(0.09, 0.06, 0.03, c2);
      clasp.position.set(0, 0.55, 0.15);
      addFit(torsoPivot, clasp);
      const mask = box(0.24, 0.12, 0.02, c3);
      mask.position.set(0, 0.72, 0.125);
      addFit(torsoPivot, mask);
    }
  }

  function setWeapon(colors) {
    gunMats.body.color.setHex(colors.body);
    gunMats.metal.color.setHex(colors.metal);
    if (colors.grip) {
      gunMats.grip.color.setHex(colors.grip);
    }
  }

  function setAccessories(list) {
    currentAccList = Array.isArray(list) ? list.slice() : [];
    clearAccessories();
    if (!Array.isArray(list)) {
      return;
    }
    for (const id of list) {
      const pZ = outfitFront;
      const chestZ = 0.14 + pZ;
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
        const strap = box(0.285, 0.02, 0.285, mat(0x14100a));
        strap.position.set(0, 0.83, 0);
        addAcc(torsoPivot, strap);
      } else if (id === "star") {
        const part = makeStarMesh(0.06, 0.02, mat(0xe8b64c));
        part.position.set(0.15, 0.43, chestZ);
        addAcc(torsoPivot, part);
      } else if (id === "cross") {
        const post = box(0.024, 0.11, 0.016, mat(0xd8c48a));
        post.position.set(0, 0.45, chestZ);
        addAcc(torsoPivot, post);
        const beam = box(0.07, 0.024, 0.016, mat(0xd8c48a));
        beam.position.set(0, 0.475, chestZ);
        addAcc(torsoPivot, beam);
        const cord = box(0.012, 0.06, 0.012, mat(0x3a2a18));
        cord.position.set(0, 0.54, chestZ);
        addAcc(torsoPivot, cord);
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
      } else if (id === "bandolier") {
        const strap = box(0.09, 0.62, 0.03, mat(0x4a3018));
        strap.position.set(0, 0.32, chestZ);
        strap.rotation.z = 0.65;
        addAcc(torsoPivot, strap);
        for (let bi = 0; bi < 3; bi++) {
          const bullet = box(0.025, 0.06, 0.02, mat(0xd8b13c));
          bullet.position.set(-0.12 + bi * 0.12, 0.42 - bi * 0.09, chestZ + 0.01);
          addAcc(torsoPivot, bullet);
        }
      } else if (id === "goldtooth") {
        const tooth = box(0.03, 0.025, 0.02, mat(0xe8b64c));
        const zPos = list.includes("beard") ? 0.136 : 0.125;
        tooth.position.set(0.035, 0.725, zPos);
        addAcc(torsoPivot, tooth);
      } else if (id === "pipe") {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), mat(0x5c3a1e));
        stem.rotation.x = Math.PI / 2;
        stem.position.set(0.06, 0.72, 0.16);
        addAcc(torsoPivot, stem);
        const bowl = box(0.04, 0.05, 0.04, mat(0x3a2412));
        bowl.position.set(0.06, 0.745, 0.2);
        addAcc(torsoPivot, bowl);
      } else if (id === "skullbadge") {
        const badge = box(0.06, 0.06, 0.02, mat(0xe8e0cf));
        badge.position.set(-0.15, 0.45, chestZ);
        addAcc(torsoPivot, badge);
        const eyeL = box(0.014, 0.014, 0.022, mat(0x14100a));
        eyeL.position.set(-0.165, 0.455, chestZ + 0.005);
        addAcc(torsoPivot, eyeL);
        const eyeR = box(0.014, 0.014, 0.022, mat(0x14100a));
        eyeR.position.set(-0.135, 0.455, chestZ + 0.005);
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
      } else if (id === "longhair") {
        hat.visible = false;
        const hairMat = mat(0x2c1c10);
        const top = box(0.30, 0.12, 0.30, hairMat);
        top.position.set(0, 0.925, -0.01);
        addAcc(torsoPivot, top);
        const back = box(0.30, 0.42, 0.12, hairMat);
        back.position.set(0, 0.72, -0.12);
        addAcc(torsoPivot, back);
        for (const sx of [-1, 1]) {
          const side = box(0.06, 0.34, 0.28, hairMat);
          side.position.set(sx * 0.155, 0.76, -0.03);
          addAcc(torsoPivot, side);
        }
      } else if (id === "shorthair") {
        hat.visible = false;
        const hairMat = mat(0x2c1c10);
        const top = box(0.29, 0.1, 0.28, hairMat);
        top.position.set(0, 0.92, -0.01);
        addAcc(torsoPivot, top);
        const back = box(0.29, 0.14, 0.06, hairMat);
        back.position.set(0, 0.82, -0.13);
        addAcc(torsoPivot, back);
        for (const sx of [-1, 1]) {
          const side = box(0.04, 0.12, 0.24, hairMat);
          side.position.set(sx * 0.15, 0.85, -0.02);
          addAcc(torsoPivot, side);
        }
      } else if (id === "ponytail") {
        hat.visible = false;
        const hairMat = mat(0x2c1c10);
        const top = box(0.29, 0.1, 0.28, hairMat);
        top.position.set(0, 0.92, -0.01);
        addAcc(torsoPivot, top);
        const back = box(0.29, 0.2, 0.06, hairMat);
        back.position.set(0, 0.8, -0.13);
        addAcc(torsoPivot, back);
        for (const sx of [-1, 1]) {
          const side = box(0.04, 0.16, 0.26, hairMat);
          side.position.set(sx * 0.15, 0.83, -0.02);
          addAcc(torsoPivot, side);
        }
        const tail = box(0.08, 0.3, 0.08, hairMat);
        tail.position.set(0, 0.72, -0.17);
        tail.rotation.x = 0.25;
        addAcc(torsoPivot, tail);
        const tie = box(0.1, 0.045, 0.1, mat(0xa83c2a));
        tie.position.set(0, 0.85, -0.15);
        addAcc(torsoPivot, tie);
      } else if (id === "braids") {
        hat.visible = false;
        const hairMat = mat(0x2c1c10);
        const top = box(0.29, 0.1, 0.28, hairMat);
        top.position.set(0, 0.92, -0.01);
        addAcc(torsoPivot, top);
        const back = box(0.29, 0.2, 0.06, hairMat);
        back.position.set(0, 0.8, -0.13);
        addAcc(torsoPivot, back);
        for (const sx of [-1, 1]) {
          const side = box(0.04, 0.16, 0.26, hairMat);
          side.position.set(sx * 0.15, 0.83, -0.02);
          addAcc(torsoPivot, side);
          const braid = box(0.06, 0.3, 0.06, hairMat);
          braid.position.set(sx * 0.15, 0.62, 0.06);
          braid.rotation.x = -0.1;
          addAcc(torsoPivot, braid);
          const tip = box(0.045, 0.05, 0.045, mat(0xa83c2a));
          tip.position.set(sx * 0.15, 0.46, 0.08);
          addAcc(torsoPivot, tip);
        }
      } else if (id === "bald") {
        hat.visible = false;
        const hairMat = mat(0x2c1c10);
        for (const sx of [-1, 1]) {
          const side = box(0.03, 0.08, 0.2, hairMat);
          side.position.set(sx * 0.145, 0.82, -0.02);
          addAcc(torsoPivot, side);
        }
      } else if (id === "goatee") {
        const part = box(0.09, 0.09, 0.05, mat(0x2a1c10));
        part.position.set(0, 0.66, 0.12);
        addAcc(torsoPivot, part);
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
      } else if (id === "blindfold") {
        const wrap = box(0.285, 0.075, 0.285, mat(0x3a2a18));
        wrap.position.set(0, 0.83, 0);
        addAcc(torsoPivot, wrap);
        const front = box(0.2, 0.075, 0.03, mat(0x3a2a18));
        front.position.set(0, 0.83, 0.13);
        addAcc(torsoPivot, front);
        const knot = box(0.04, 0.05, 0.04, mat(0x2a1c10));
        knot.position.set(0, 0.83, -0.15);
        addAcc(torsoPivot, knot);
      } else if (id === "deputybadge") {
        const badge = makeStarMesh(0.045, 0.02, mat(0xaeb3b8));
        badge.position.set(0.15, 0.45, chestZ);
        addAcc(torsoPivot, badge);
      } else if (id === "medallion") {
        const cord = box(0.012, 0.08, 0.012, mat(0x3a2a18));
        cord.position.set(0, 0.54, chestZ);
        addAcc(torsoPivot, cord);
        const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 12), mat(0xe8b64c));
        pendant.rotation.x = Math.PI / 2;
        pendant.position.set(0, 0.48, chestZ);
        addAcc(torsoPivot, pendant);
      } else if (id === "cardband") {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.172, 0.05, 12), mat(0x4a3018));
        band.position.y = 0.045;
        addAcc(hat, band);
        const card = box(0.06, 0.09, 0.02, mat(0xf0ead8));
        card.position.set(0.1, 0.08, 0.14);
        addAcc(hat, card);
        const pip = box(0.018, 0.018, 0.02, mat(0xc0392b));
        pip.position.set(0.1, 0.08, 0.151);
        addAcc(hat, pip);
      } else if (id === "sheriffpin") {
        const star = makeStarMesh(0.035, 0.015, mat(0xe8b64c));
        star.position.set(0, 0.08, 0.155);
        star.rotation.x = -0.15;
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
      }
    }
  }

  function setDrawn(drawn) {
    anim.drawn = drawn;
    const showGun = drawn && !anim.unarmed;
    handGun.visible = showGun && !anim.leftHanded;
    handGunL.visible = showGun && anim.leftHanded;
    holsterGun.visible = !drawn && !anim.unarmed;
  }

  function setUnarmed(active) {
    anim.unarmed = !!active;
    holster.visible = !anim.unarmed;
    holsterGun.visible = !anim.unarmed && !anim.drawn;
    if (anim.unarmed) {
      handGun.visible = false;
      handGunL.visible = false;
    }
  }

  function setLeftHanded(active) {
    anim.leftHanded = !!active;
    setDrawn(anim.drawn);
  }

  function reset() {
    anim.time = 0;
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
    anim.unarmed = false;
    anim.leftHanded = false;
    anim.leanZ = 0;
    holster.visible = true;
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
    flashL.visible = false;
    flashLightL.intensity = 0;
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

  function holdGun(active, aimHigh) {
    anim.armTarget = active ? (aimHigh ? -1.4 : -1.15) : 0;
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
    anim.seatHostage = active === "hostage";
    anim.seatSeiza = active === "seiza";
  }

  function playShoot() {
    setDrawn(true);
    anim.flashUntil = anim.time + 0.16;
    if (anim.leftHanded) {
      flashL.visible = true;
      flashLightL.intensity = 14;
    } else {
      flash.visible = true;
      flashLight.intensity = 14;
    }
    anim.armCurrent = -Math.PI / 2 - 0.35;
  }

  function playReload() {
    anim.armTarget = -Math.PI / 2;
  }

  function playDodge(dir) {
    anim.dodgeTarget = Math.max(-2.6, Math.min(2.6, anim.dodgeTarget + dir * 1.5));
  }

  function setWalk(active) {
    anim.walk = active;
  }

  function setHolsterHand(active) {
    anim.holsterHand = !!active;
  }

  function setLean(z) {
    anim.leanZ = z;
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

  function playDeath(sceneRef, rest, fallDir) {
    let fall = "forward";
    if (fallDir === true || fallDir === "back") fall = "back";
    else if (fallDir === "left") fall = "left";
    else if (fallDir === "right") fall = "right";
    anim.armTarget = 0;
    anim.death = { t: 0, rest: rest === undefined ? 0 : rest, fall: fall };
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
    const handsBehindHead = anim.seated && anim.seatSeiza;
    const gunArm = anim.leftHanded ? armL : armR;
    const offArm = anim.leftHanded ? armR : armL;
    if (!handsBehindHead) {
      gunArm.shoulder.rotation.x = anim.armCurrent;
      let elbowBend = 0;
      if (anim.armCurrent < -0.3) {
        elbowBend = -0.14;
      }
      gunArm.elbow.rotation.x += (elbowBend - gunArm.elbow.rotation.x) * Math.min(1, dt * lerpSpeed);
    }

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
      group.rotation.z = (anim.dodgeTarget - anim.dodgeCurrent) * 0.16 + anim.leanZ;
    }

    if (anim.walk && anim.death === null) {
      anim.walkPhase += dt * 6.4;
      const swing = Math.sin(anim.walkPhase);
      legL.hip.rotation.x = swing * 0.62;
      legR.hip.rotation.x = -swing * 0.62;
      legL.knee.rotation.x = Math.max(0, Math.sin(anim.walkPhase + Math.PI * 0.5)) * 0.85;
      legR.knee.rotation.x = Math.max(0, Math.sin(anim.walkPhase + Math.PI * 1.5)) * 0.85;
      offArm.shoulder.rotation.x = -swing * 0.45;
      offArm.elbow.rotation.x = -0.3 - Math.max(0, swing) * 0.25;
      if (!anim.drawn && anim.armTarget === 0) {
        gunArm.shoulder.rotation.x = swing * 0.45;
        gunArm.elbow.rotation.x = -0.3 - Math.max(0, -swing) * 0.25;
      }
      torsoPivot.rotation.y = Math.sin(anim.walkPhase) * 0.06;
    } else if (anim.death === null) {
      let hipRest = 0;
      let kneeRest = 0;
      if (anim.seated && anim.seatFloor) {
        hipRest = -1.5;
        kneeRest = 0.4;
      } else if (anim.seated && anim.seatSeiza) {
        hipRest = -0.15;
        kneeRest = 1.7;
      } else if (anim.seated && anim.seatHostage) {
        hipRest = 0.2;
        kneeRest = 1.57;
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
      if (!anim.talk && !handsBehindHead) {
        offArm.shoulder.rotation.x += (Math.sin(anim.time * 1.6) * 0.03 - offArm.shoulder.rotation.x) * Math.min(1, dt * 8);
        offArm.elbow.rotation.x += (-0.08 - offArm.elbow.rotation.x) * Math.min(1, dt * 8);
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
        const armLerp = Math.min(1, dt * 8);
        if (anim.seatSeiza) {
          armR.shoulder.rotation.z += (0.45 - armR.shoulder.rotation.z) * armLerp;
          armL.shoulder.rotation.z += (-0.45 - armL.shoulder.rotation.z) * armLerp;
          armR.shoulder.rotation.x += (-2.9 - armR.shoulder.rotation.x) * armLerp;
          armL.shoulder.rotation.x += (-2.9 - armL.shoulder.rotation.x) * armLerp;
          armR.elbow.rotation.x += (-2.5 - armR.elbow.rotation.x) * armLerp;
          armL.elbow.rotation.x += (-2.5 - armL.elbow.rotation.x) * armLerp;
        } else {
          let shoulderRest = -0.5;
          let elbowRest = -0.45;
          if (anim.seatFloor) {
            shoulderRest = 0.7;
            elbowRest = -0.2;
          } else if (anim.seatHostage) {
            shoulderRest = -2.8;
            elbowRest = -2.4;
          }
          armR.shoulder.rotation.x += (shoulderRest - armR.shoulder.rotation.x) * armLerp;
          armR.elbow.rotation.x += (elbowRest - armR.elbow.rotation.x) * armLerp;
          armL.shoulder.rotation.x += (shoulderRest - armL.shoulder.rotation.x) * armLerp;
          armL.elbow.rotation.x += (elbowRest - armL.elbow.rotation.x) * armLerp;
        }
        } else if (anim.holsterHand) {
          armR.shoulder.rotation.z = -0.05;
          armR.shoulder.rotation.x = 0.62;
          armR.elbow.rotation.x = -1.40;
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
      const angle = Math.PI / 2 * eased;
      if (anim.death.fall === "back") group.rotation.x = angle;
      else if (anim.death.fall === "forward") group.rotation.x = -angle;
      else if (anim.death.fall === "left") group.rotation.z = angle;
      else if (anim.death.fall === "right") group.rotation.z = -angle;
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

    if (anim.time > anim.flashUntil) {
      if (flash.visible) {
        flash.visible = false;
        flashLight.intensity = 0;
      }
      if (flashL.visible) {
        flashL.visible = false;
        flashLightL.intensity = 0;
      }
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
    setOutfit: setOutfit,
    reset: reset,
    playDraw: playDraw,
    playHolster: playHolster,
    holdGun: holdGun,
    playShoot: playShoot,
    playReload: playReload,
    playDodge: playDodge,
    setWalk: setWalk,
    setUnarmed: setUnarmed,
    setLeftHanded: setLeftHanded,
    setLean: setLean,
    setHolsterHand: setHolsterHand,
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
