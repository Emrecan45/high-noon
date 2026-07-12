import * as THREE from "three";

const CAM_TIME = 0.9;
const ROAD_SPEED = 1.35;
const ROAD_END_Z = -32;

export function createTown(arena, playerBody, fadeThrough, onDoor) {
  const anchors = arena.anchors;
  let active = false;
  let station = "home";
  let camTween = null;
  let arriveCb = null;
  let roadWalking = false;
  let seq = null;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const fromPos = new THREE.Vector3();
  const fromLook = new THREE.Vector3();
  const followPos = new THREE.Vector3();
  const followLook = new THREE.Vector3();

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function applyCamera() {
    arena.playerRig.position.copy(camPos);
    arena.camera.position.set(0, 0, 0);
    arena.camera.lookAt(camLook);
  }

  function placeCharacterHome() {
    playerBody.group.position.copy(anchors.home.spot);
    playerBody.group.rotation.set(0, anchors.home.face, 0);
    playerBody.setWalk(false);
    playerBody.group.visible = true;
  }

  function setActive(value) {
    active = value;
    arena.setWalkersVisible(value);
    if (active) {
      playerBody.group.visible = true;
    }
  }

  function jumpTo(target) {
    camTween = null;
    seq = null;
    camPos.copy(target.cam);
    camLook.copy(target.look);
    applyCamera();
  }

  function runSeq(steps) {
    camTween = null;
    roadWalking = false;
    seq = { steps: steps, i: 0, t: 0, started: false };
  }

  function stepSeq(dt) {
    while (seq !== null && seq.i < seq.steps.length) {
      const step = seq.steps[seq.i];
      if (step.call !== undefined) {
        step.call();
        seq.i += 1;
        continue;
      }
      if (step.jump !== undefined) {
        camPos.copy(step.jump.cam);
        camLook.copy(step.jump.look);
        applyCamera();
        seq.i += 1;
        continue;
      }
      if (step.wait !== undefined) {
        seq.t += dt;
        if (seq.t >= step.wait) {
          seq.t = 0;
          seq.i += 1;
          continue;
        }
        return;
      }
      if (step.tween !== undefined) {
        if (!seq.started) {
          seq.started = true;
          seq.t = 0;
          fromPos.copy(camPos);
          fromLook.copy(camLook);
        }
        seq.t += dt / step.dur;
        if (seq.t >= 1) {
          camPos.copy(step.tween.cam);
          camLook.copy(step.tween.look);
          applyCamera();
          seq.t = 0;
          seq.started = false;
          seq.i += 1;
          continue;
        }
        let e = seq.t;
        if (step.ease === "in") {
          e = e * e;
        } else if (step.ease === "out") {
          e = 1 - (1 - e) * (1 - e);
        } else if (step.ease !== "linear") {
          e = smooth(e);
        }
        camPos.lerpVectors(fromPos, step.tween.cam, e);
        camLook.lerpVectors(fromLook, step.tween.look, e);
        applyCamera();
        return;
      }
      seq.i += 1;
    }
    seq = null;
  }

  function goStoreEnter(target, onArrived) {
    station = "store";
    arriveCb = onArrived || null;
    const door = target.door;
    runSeq([
      { tween: target.approach, dur: 0.65, ease: "in" },
      { call: function () { door.set(true); if (onDoor) { onDoor(); } } },
      { tween: door.outside, dur: 0.45, ease: "linear" },
      { tween: door.inside, dur: 0.4, ease: "linear" },
      { tween: { cam: target.cam, look: target.look }, dur: 0.65, ease: "out" },
      { call: finishArrival }
    ]);
  }

  function goStoreExit(target) {
    runSeq([
      { tween: target.door.inside, dur: 0.4, ease: "in" },
      { tween: target.door.outside, dur: 0.4, ease: "linear" },
      { call: function () { target.door.set(false); } },
      { tween: target.approach, dur: 0.45, ease: "linear" },
      { tween: anchors.home, dur: 0.7, ease: "out" },
      { call: finishArrival }
    ]);
  }

  function goHome(instant, onArrived) {
    const from = anchors[station];
    const wasCut = from !== undefined && from.cut === true;
    const viaDoor = from !== undefined && from.door !== undefined && station === "store";
    station = "home";
    roadWalking = false;
    arriveCb = onArrived || null;
    placeCharacterHome();
    if (viaDoor && !instant) {
      goStoreExit(from);
    } else if (wasCut && !instant) {
      fadeThrough(function () {
        jumpTo(anchors.home);
        finishArrival();
      });
    } else if (instant || wasCut) {
      seq = null;
      jumpTo(anchors.home);
      finishArrival();
    } else {
      fromPos.copy(camPos);
      fromLook.copy(camLook);
      camTween = { t: 0, toPos: anchors.home.cam, toLook: anchors.home.look };
    }
  }

  function warpTo(name) {
    const target = anchors[name];
    if (target === undefined) {
      return;
    }
    station = name;
    roadWalking = false;
    arriveCb = null;
    if (name === "home") {
      placeCharacterHome();
    } else {
      playerBody.group.visible = true;
    }
    jumpTo(target);
  }

  function goTo(name, onArrived) {
    const target = anchors[name];
    if (target === undefined) {
      return;
    }
    const wasCut = anchors[station] !== undefined && anchors[station].cut === true;
    if (target.door !== undefined && !wasCut) {
      roadWalking = false;
      goStoreEnter(target, onArrived);
      return;
    }
    station = name;
    roadWalking = false;
    arriveCb = onArrived || null;
    if (target.cut === true && target.approach !== undefined && !wasCut) {
      fromPos.copy(camPos);
      fromLook.copy(camLook);
      camTween = {
        t: 0,
        toPos: target.approach.cam,
        toLook: target.approach.look,
        thenCut: target
      };
      return;
    }
    if (target.cut === true || wasCut) {
      jumpTo(target);
      finishArrival();
      return;
    }
    fromPos.copy(camPos);
    fromLook.copy(camLook);
    camTween = { t: 0, toPos: target.cam, toLook: target.look };
  }

  function startRoadWalk() {
    station = "road";
    arriveCb = null;
    camTween = null;
    roadWalking = true;
    playerBody.group.visible = true;
    playerBody.group.position.set(0.2, 0, 1.5);
    playerBody.group.rotation.set(0, Math.PI, 0);
    playerBody.setWalk(true);
    followPos.set(playerBody.group.position.x + 2.4, 2.1, playerBody.group.position.z + 5.4);
    followLook.set(playerBody.group.position.x, 1.25, playerBody.group.position.z - 4);
    camPos.copy(followPos);
    camLook.copy(followLook);
    applyCamera();
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
    if (camTween !== null && target !== undefined) {
      jumpTo(target);
      finishArrival();
    }
  }

  function update(dt) {
    if (!active) {
      return;
    }
    if (seq !== null) {
      stepSeq(dt);
      playerBody.update(dt);
      return;
    }
    if (roadWalking) {
      const body = playerBody.group;
      if (body.position.z > ROAD_END_Z) {
        body.position.z -= ROAD_SPEED * dt;
        playerBody.setWalk(true);
      } else {
        playerBody.setWalk(false);
      }
      followPos.set(body.position.x + 2.4, 2.1, body.position.z + 5.4);
      followLook.set(body.position.x, 1.25, body.position.z - 4);
      camPos.lerp(followPos, Math.min(1, dt * 3));
      camLook.lerp(followLook, Math.min(1, dt * 3));
      applyCamera();
      playerBody.update(dt);
      return;
    }
    if (camTween !== null) {
      camTween.t += dt / CAM_TIME;
      if (camTween.t >= 1) {
        camPos.copy(camTween.toPos);
        camLook.copy(camTween.toLook);
        const cutTarget = camTween.thenCut;
        camTween = null;
        applyCamera();
        if (cutTarget !== undefined && cutTarget !== null) {
          fadeThrough(function () {
            jumpTo(cutTarget);
            finishArrival();
          });
        } else {
          finishArrival();
        }
      } else {
        const e = smooth(camTween.t);
        camPos.lerpVectors(fromPos, camTween.toPos, e);
        camLook.lerpVectors(fromLook, camTween.toLook, e);
        applyCamera();
      }
    } else if (station === "home") {
      const sway = Math.sin(performance.now() / 1000 * 0.22);
      arena.camera.position.set(0, 0, 0);
      arena.playerRig.position.set(camPos.x + sway * 0.1, camPos.y, camPos.z);
      arena.camera.lookAt(camLook);
    }
    playerBody.update(dt);
  }

  function currentStation() {
    return station;
  }

  function isBusy() {
    return camTween !== null || seq !== null;
  }

  return {
    setActive: setActive,
    goHome: goHome,
    goTo: goTo,
    warpTo: warpTo,
    startRoadWalk: startRoadWalk,
    skip: skip,
    update: update,
    currentStation: currentStation,
    isBusy: isBusy,
    isActive: function () {
      return active;
    }
  };
}
