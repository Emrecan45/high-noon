import * as THREE from "three";
import { createRevolver } from "./revolver.js";

function mat(color) {
  return new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
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
  hat.position.y = 0.97;
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

  const armL = makeArm(-1);
  const armR = makeArm(1);

  const gunMats = {
    body: mat(0x2c2c30),
    metal: mat(0x3a3a40),
    grip: mat(0x5c3a1e)
  };

  const holster = new THREE.Group();
  const holsterPocket = box(0.09, 0.24, 0.14, darkLeather);
  holsterPocket.rotation.z = -0.12;
  holster.add(holsterPocket);
  holster.position.set(0.28, -0.08, 0.02);
  torsoPivot.add(holster);

  const holsterGun = createRevolver(gunMats, false);
  holsterGun.scale.setScalar(1.35);
  holsterGun.rotation.set(0.2, 0, -0.12);
  holsterGun.position.set(0.29, 0.06, 0.03);
  torsoPivot.add(holsterGun);

  const handGun = createRevolver(gunMats, false);
  handGun.scale.setScalar(1.35);
  handGun.rotation.set(Math.PI / 2, 0, 0);
  handGun.position.set(0, -0.36, 0.05);
  handGun.visible = false;
  armR.elbow.add(handGun);

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.26, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd977, transparent: true, opacity: 0.95 })
  );
  flash.rotation.x = Math.PI / 2;
  flash.position.set(0, -0.38, 0.62);
  flash.visible = false;
  armR.elbow.add(flash);
  const flashLight = new THREE.PointLight(0xffc26b, 0, 8);
  flashLight.position.set(0, -0.38, 0.6);
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
        const part = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 5), mat(0xe8b64c));
        part.rotation.x = Math.PI / 2;
        part.position.set(-0.15, 0.43, 0.15);
        addAcc(torsoPivot, part);
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
      hat.position.set(0, 0.97, 0);
      hat.rotation.set(0, 0, 0);
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

  function playShoot() {
    setDrawn(true);
    anim.flashUntil = anim.time + 0.08;
    flash.visible = true;
    flashLight.intensity = 6;
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

  function playDeath(sceneRef) {
    anim.death = { t: 0 };
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
      torsoPivot.rotation.z = lean * 0.4;
      torsoPivot.rotation.x = -flinchLean;

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
      legL.hip.rotation.x += (0 - legL.hip.rotation.x) * Math.min(1, dt * 10);
      legR.hip.rotation.x += (0 - legR.hip.rotation.x) * Math.min(1, dt * 10);
      legL.knee.rotation.x += (0 - legL.knee.rotation.x) * Math.min(1, dt * 10);
      legR.knee.rotation.x += (0 - legR.knee.rotation.x) * Math.min(1, dt * 10);
      armL.shoulder.rotation.x += (Math.sin(anim.time * 1.6) * 0.03 - armL.shoulder.rotation.x) * Math.min(1, dt * 8);
      armL.elbow.rotation.x += (-0.08 - armL.elbow.rotation.x) * Math.min(1, dt * 8);
      torsoPivot.rotation.y += (0 - torsoPivot.rotation.y) * Math.min(1, dt * 8);
    }

    if (anim.death !== null) {
      anim.death.t += dt;
      const t = Math.min(1, anim.death.t / 0.85);
      const buckle = Math.min(1, anim.death.t / 0.3);
      legL.knee.rotation.x = buckle * 1.3;
      legR.knee.rotation.x = buckle * 1.1;
      group.position.y = -buckle * 0.32;
      const fall = Math.max(0, (anim.death.t - 0.12) / 0.73);
      const eased = Math.min(1, fall * fall);
      group.rotation.x = -Math.PI / 2 * eased;
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
    playShoot: playShoot,
    playReload: playReload,
    playDodge: playDodge,
    setWalk: setWalk,
    playFlinch: playFlinch,
    playDeath: playDeath,
    playHatShot: playHatShot,
    isHatGone: isHatGone,
    setWounded: setWounded,
    isDown: isDown,
    update: update
  };
}
