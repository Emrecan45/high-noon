import * as THREE from "three";

function mat(color) {
  return new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.3 });
}

export function createViewmodel(camera) {
  const group = new THREE.Group();
  camera.add(group);

  const gun = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.22), mat(0x2c2c30));
  gun.add(frame);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), mat(0x3a3a40));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.025, -0.24);
  gun.add(barrel);
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.07, 6), mat(0x44444c));
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.set(0, 0.01, -0.06);
  gun.add(cylinder);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), mat(0x5c3a1e));
  grip.position.set(0, -0.085, 0.08);
  grip.rotation.x = 0.35;
  gun.add(grip);
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.05, 0.02), mat(0x3a3a40));
  hammer.position.set(0, 0.06, 0.1);
  gun.add(hammer);

  const handMat = new THREE.MeshStandardMaterial({ color: 0xc98f5e, roughness: 0.9 });
  const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.11), handMat);
  handMesh.position.set(0, -0.07, 0.09);
  gun.add(handMesh);

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.18, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd977, transparent: true, opacity: 0.95 })
  );
  flash.rotation.x = -Math.PI / 2;
  flash.position.set(0, 0.025, -0.48);
  flash.visible = false;
  gun.add(flash);
  const flashLight = new THREE.PointLight(0xffc26b, 0, 4);
  flashLight.position.set(0, 0, -0.5);
  gun.add(flashLight);

  group.add(gun);

  const basePos = new THREE.Vector3(0.22, -0.22, -0.55);
  const holsterPos = new THREE.Vector3(0.26, -0.85, -0.45);
  group.position.copy(holsterPos);

  const state = {
    time: 0,
    mode: "holstered",
    drawStart: 0,
    recoil: 0,
    reloadUntil: 0,
    reloadStart: 0,
    flashUntil: 0
  };

  const shells = [];
  const shellGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.032, 6);
  const shellMat = mat(0xd4a017);

  function ejectShell() {
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(0.03, 0.02, -0.05);
    group.add(shell);
    shells.push({
      mesh: shell,
      vel: new THREE.Vector3(0.5 + Math.random() * 0.3, 0.45 + Math.random() * 0.2, 0.15 * (Math.random() - 0.3)),
      spin: new THREE.Vector3(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7),
      life: 0
    });
  }

  function updateShells(dt) {
    for (let i = shells.length - 1; i >= 0; i--) {
      const shell = shells[i];
      shell.life += dt;
      if (shell.life > 1) {
        group.remove(shell.mesh);
        shells.splice(i, 1);
        continue;
      }
      shell.vel.y -= 2.6 * dt;
      shell.mesh.position.addScaledVector(shell.vel, dt);
      shell.mesh.rotation.x += shell.spin.x * dt;
      shell.mesh.rotation.y += shell.spin.y * dt;
      shell.mesh.rotation.z += shell.spin.z * dt;
    }
  }

  function holster() {
    state.mode = "holstered";
  }

  function draw() {
    state.mode = "drawing";
    state.drawStart = state.time;
  }

  function shoot() {
    state.recoil = 1;
    state.flashUntil = state.time + 0.07;
    flash.visible = true;
    flashLight.intensity = 4;
  }

  function reload(duration) {
    state.mode = "reloading";
    state.reloadStart = state.time;
    state.reloadUntil = state.time + duration;
    if (duration >= 0.7) {
      ejectShell();
    }
  }

  function isReady() {
    return state.mode === "ready";
  }

  function update(dt) {
    state.time += dt;
    updateShells(dt);

    if (state.mode === "holstered") {
      group.position.lerp(holsterPos, Math.min(1, dt * 10));
    } else if (state.mode === "drawing") {
      const t = (state.time - state.drawStart) / 0.13;
      if (t >= 1) {
        state.mode = "ready";
        group.position.copy(basePos);
      } else {
        group.position.lerpVectors(holsterPos, basePos, t);
      }
    } else if (state.mode === "reloading") {
      const progress = (state.time - state.reloadStart) / Math.max(0.01, state.reloadUntil - state.reloadStart);
      cylinder.rotation.z = progress * Math.PI * 4;
      gun.rotation.z = Math.sin(progress * Math.PI) * 0.5;
      gun.position.y = -Math.sin(progress * Math.PI) * 0.06;
      if (state.time >= state.reloadUntil) {
        state.mode = "ready";
        gun.rotation.z = 0;
        gun.position.y = 0;
      }
    }

    if (state.mode === "ready" || state.mode === "reloading") {
      const swayX = Math.sin(state.time * 1.7) * 0.004;
      const swayY = Math.cos(state.time * 2.3) * 0.003;
      group.position.x = basePos.x + swayX;
      group.position.y = basePos.y + swayY - state.recoil * 0.03;
    }

    if (state.recoil > 0) {
      state.recoil = Math.max(0, state.recoil - dt * 6);
      gun.rotation.x = state.recoil * 0.5;
    }

    if (flash.visible && state.time > state.flashUntil) {
      flash.visible = false;
      flashLight.intensity = 0;
    }
  }

  return {
    holster: holster,
    draw: draw,
    shoot: shoot,
    reload: reload,
    isReady: isReady,
    update: update
  };
}
