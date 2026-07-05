import * as THREE from "three";

function mat(color) {
  return new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
}

function box(w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.castShadow = true;
  return mesh;
}

export function createCowboy() {
  const group = new THREE.Group();
  const hitMeshes = [];

  const skin = 0xc98f5e;
  const shirt = 0x7a2f24;
  const pants = 0x30425c;
  const leather = 0x4a3018;

  const legL = box(0.17, 0.82, 0.2, pants);
  legL.position.set(-0.12, 0.41, 0);
  const legR = box(0.17, 0.82, 0.2, pants);
  legR.position.set(0.12, 0.41, 0);
  group.add(legL);
  group.add(legR);
  const bootL = box(0.18, 0.12, 0.3, leather);
  bootL.position.set(-0.12, 0.06, 0.04);
  const bootR = box(0.18, 0.12, 0.3, leather);
  bootR.position.set(0.12, 0.06, 0.04);
  group.add(bootL);
  group.add(bootR);

  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.82;
  group.add(torsoPivot);

  const torso = box(0.52, 0.62, 0.28, shirt);
  torso.position.y = 0.31;
  torsoPivot.add(torso);
  const belt = box(0.54, 0.08, 0.3, leather);
  belt.position.y = 0.02;
  torsoPivot.add(belt);
  const bandana = box(0.2, 0.1, 0.2, 0xc9a227);
  bandana.position.y = 0.64;
  torsoPivot.add(bandana);

  const head = box(0.26, 0.26, 0.26, skin);
  head.position.y = 0.82;
  torsoPivot.add(head);
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 12), mat(leather));
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 12), mat(leather));
  crown.position.y = 0.1;
  brim.castShadow = true;
  crown.castShadow = true;
  hat.add(brim);
  hat.add(crown);
  hat.position.y = 0.98;
  torsoPivot.add(hat);

  const armL = box(0.13, 0.6, 0.13, shirt);
  armL.position.set(-0.34, 0.32, 0);
  torsoPivot.add(armL);

  const armPivot = new THREE.Group();
  armPivot.position.set(0.34, 0.6, 0);
  torsoPivot.add(armPivot);
  const armR = box(0.13, 0.58, 0.13, shirt);
  armR.position.y = -0.29;
  armPivot.add(armR);
  const hand = box(0.1, 0.1, 0.1, skin);
  hand.position.y = -0.62;
  armPivot.add(hand);
  const gun = new THREE.Group();
  const gunBody = box(0.05, 0.12, 0.16, 0x2c2c30);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.3, 8), mat(0x3a3a40));
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.03, 0.2);
  gun.add(gunBody);
  gun.add(gunBarrel);
  gun.position.set(0, -0.68, 0.08);
  armPivot.add(gun);

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.3, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd977, transparent: true, opacity: 0.95 })
  );
  flash.rotation.x = Math.PI / 2;
  flash.position.set(0, -0.65, 0.55);
  flash.visible = false;
  armPivot.add(flash);
  const flashLight = new THREE.PointLight(0xffc26b, 0, 8);
  flashLight.position.set(0, -0.6, 0.6);
  armPivot.add(flashLight);

  head.userData.part = "head";
  hat.traverse(function (child) {
    child.userData.part = "hat";
  });
  torso.userData.part = "body";
  belt.userData.part = "body";
  legL.userData.part = "body";
  legR.userData.part = "body";
  armL.userData.part = "body";
  armR.userData.part = "body";

  hitMeshes.push(head, brim, crown, torso, belt, legL, legR, armL, armR);

  const anim = {
    time: 0,
    armTarget: 0,
    armCurrent: 0,
    dodge: null,
    death: null,
    flinch: 0,
    flashUntil: 0,
    wounded: false,
    hatFlying: false,
    hatVel: new THREE.Vector3(),
    hatSpin: new THREE.Vector3()
  };

  function reset() {
    anim.armTarget = 0;
    anim.armCurrent = 0;
    anim.dodge = null;
    anim.death = null;
    anim.flinch = 0;
    anim.wounded = false;
    group.rotation.set(0, 0, 0);
    group.position.x = 0;
    torsoPivot.rotation.set(0, 0, 0);
    armPivot.rotation.set(0, 0, 0);
    flash.visible = false;
    flashLight.intensity = 0;
    if (anim.hatFlying) {
      anim.hatFlying = false;
      torsoPivot.add(hat);
      hat.position.set(0, 0.98, 0);
      hat.rotation.set(0, 0, 0);
    }
  }

  function playDraw() {
    anim.armTarget = -Math.PI / 2;
  }

  function playHolster() {
    anim.armTarget = 0;
  }

  function playShoot() {
    anim.flashUntil = anim.time + 0.08;
    flash.visible = true;
    flashLight.intensity = 6;
    anim.armCurrent = -Math.PI / 2 - 0.35;
  }

  function playReload() {
    anim.armTarget = -Math.PI / 4;
  }

  function playDodge(dir) {
    anim.dodge = { t: 0, dir: dir };
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
    armPivot.rotation.x = anim.armCurrent;

    if (anim.death === null && anim.dodge === null) {
      const bob = Math.sin(anim.time * 1.6) * 0.012;
      torsoPivot.position.y = 0.82 + bob;
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
    }

    if (anim.dodge !== null) {
      anim.dodge.t += dt;
      const t = anim.dodge.t;
      const total = 1.1;
      const out = 0.35;
      const hold = 0.75;
      let x = 0;
      if (t < out) {
        x = (t / out) * 1.35;
      } else if (t < hold) {
        x = 1.35;
      } else if (t < total) {
        x = 1.35 * (1 - (t - hold) / (total - hold));
      } else {
        anim.dodge = null;
      }
      if (anim.dodge !== null) {
        group.position.x = x * anim.dodge.dir;
        group.rotation.z = -0.35 * (x / 1.35) * anim.dodge.dir;
      } else {
        group.position.x = 0;
        group.rotation.z = 0;
      }
    }

    if (anim.death !== null) {
      anim.death.t += dt;
      const t = Math.min(1, anim.death.t / 0.8);
      const eased = t * t;
      group.rotation.x = -Math.PI / 2 * eased;
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
    hitMeshes: hitMeshes,
    reset: reset,
    playDraw: playDraw,
    playHolster: playHolster,
    playShoot: playShoot,
    playReload: playReload,
    playDodge: playDodge,
    playFlinch: playFlinch,
    playDeath: playDeath,
    playHatShot: playHatShot,
    isHatGone: isHatGone,
    setWounded: setWounded,
    isDown: isDown,
    update: update
  };
}
