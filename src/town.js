import * as THREE from "three";

const WALK_SPEED = 3.1;
const CAM_TIME = 1.15;

export function createTown(arena, playerBody) {
  const anchors = arena.anchors;
  let active = false;
  let station = "home";
  let walk = null;
  let camTween = null;
  let arriveCb = null;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const fromPos = new THREE.Vector3();
  const fromLook = new THREE.Vector3();

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function applyCamera() {
    arena.playerRig.position.copy(camPos);
    arena.camera.position.set(0, 0, 0);
    arena.camera.lookAt(camLook);
  }

  function startCamTween(target) {
    fromPos.copy(camPos);
    fromLook.copy(camLook);
    camTween = { t: 0, toPos: target.cam, toLook: target.look };
  }

  function placeCharacter(anchor) {
    playerBody.group.position.copy(anchor.spot);
    playerBody.group.rotation.set(0, anchor.face, 0);
    playerBody.setWalk(false);
  }

  function setActive(value) {
    active = value;
    if (active) {
      playerBody.group.visible = true;
    }
  }

  function goHome(instant) {
    station = "home";
    walk = null;
    arriveCb = null;
    playerBody.group.visible = true;
    if (instant) {
      camTween = null;
      placeCharacter(anchors.home);
      camPos.copy(anchors.home.cam);
      camLook.copy(anchors.home.look);
      applyCamera();
    } else {
      goTo("home", null);
    }
  }

  function warpTo(name) {
    const target = anchors[name];
    if (target === undefined) {
      return;
    }
    station = name;
    walk = null;
    arriveCb = null;
    camTween = null;
    playerBody.group.visible = true;
    placeCharacter(target);
    camPos.copy(target.cam);
    camLook.copy(target.look);
    applyCamera();
  }

  function goTo(name, onArrived) {
    const target = anchors[name];
    if (target === undefined) {
      return;
    }
    station = name;
    arriveCb = onArrived || null;
    playerBody.group.visible = true;
    const from = playerBody.group.position.clone();
    const dist = from.distanceTo(target.spot);
    if (dist > 0.3) {
      walk = { from: from, to: target.spot.clone(), t: 0, dur: dist / WALK_SPEED, face: target.face };
      playerBody.setWalk(true);
      const dx = target.spot.x - from.x;
      const dz = target.spot.z - from.z;
      playerBody.group.rotation.y = Math.atan2(dx, dz);
    } else {
      walk = null;
      placeCharacter(target);
      finishArrival();
    }
    startCamTween(target);
  }

  function finishArrival() {
    if (arriveCb !== null) {
      const cb = arriveCb;
      arriveCb = null;
      cb();
    }
  }

  function skip() {
    const target = anchors[station];
    if (walk !== null) {
      walk = null;
      placeCharacter(target);
      finishArrival();
    }
    if (camTween !== null) {
      camTween = null;
      camPos.copy(target.cam);
      camLook.copy(target.look);
      applyCamera();
    }
  }

  function update(dt) {
    if (!active) {
      return;
    }
    if (walk !== null) {
      walk.t += dt / walk.dur;
      if (walk.t >= 1) {
        const target = anchors[station];
        walk = null;
        placeCharacter(target);
        finishArrival();
      } else {
        playerBody.group.position.lerpVectors(walk.from, walk.to, walk.t);
      }
    }
    if (camTween !== null) {
      camTween.t += dt / CAM_TIME;
      if (camTween.t >= 1) {
        camPos.copy(camTween.toPos);
        camLook.copy(camTween.toLook);
        camTween = null;
      } else {
        const e = smooth(camTween.t);
        camPos.lerpVectors(fromPos, camTween.toPos, e);
        camLook.lerpVectors(fromLook, camTween.toLook, e);
      }
      applyCamera();
    } else if (walk === null && arriveCb === null && station === "home") {
      const sway = Math.sin(performance.now() / 1000 * 0.22);
      arena.camera.position.set(0, 0, 0);
      arena.playerRig.position.set(camPos.x + sway * 0.12, camPos.y, camPos.z);
      arena.camera.lookAt(camLook);
    } else {
      applyCamera();
    }
    playerBody.update(dt);
  }

  function currentStation() {
    return station;
  }

  function isBusy() {
    return walk !== null || camTween !== null;
  }

  return {
    setActive: setActive,
    goHome: goHome,
    goTo: goTo,
    warpTo: warpTo,
    skip: skip,
    update: update,
    currentStation: currentStation,
    isBusy: isBusy,
    isActive: function () {
      return active;
    }
  };
}
