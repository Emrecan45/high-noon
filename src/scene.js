import * as THREE from "three";
import { buildTown } from "./town3d.js";
import { createInteriors } from "./interiors.js";

function groundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c9995c";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const shade = 140 + Math.floor(Math.random() * 80);
    ctx.fillStyle = "rgb(" + shade + "," + Math.floor(shade * 0.72) + "," + Math.floor(shade * 0.42) + ")";
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  return tex;
}

function makeCactus(scale) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.4, 8), mat);
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  group.add(trunk);
  const armGeo = new THREE.CylinderGeometry(0.14, 0.16, 1, 8);
  const arm1 = new THREE.Mesh(armGeo, mat);
  arm1.position.set(0.45, 1.5, 0);
  arm1.rotation.z = -0.5;
  group.add(arm1);
  const arm2 = new THREE.Mesh(armGeo, mat);
  arm2.position.set(-0.42, 1.1, 0);
  arm2.rotation.z = 0.6;
  group.add(arm2);
  group.scale.setScalar(scale);
  return group;
}

function makeBarrel() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.95 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.9, 10), mat);
  barrel.position.y = 0.45;
  barrel.castShadow = true;
  return barrel;
}

function makeWaterTower() {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4f3419, roughness: 1 });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.6, 12), woodMat);
  tank.position.y = 7;
  tank.castShadow = true;
  group.add(tank);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.2, 12), woodMat);
  roof.position.y = 8.9;
  group.add(roof);
  const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 5.8, 6);
  const positions = [
    [1.2, 1.2],
    [-1.2, 1.2],
    [1.2, -1.2],
    [-1.2, -1.2]
  ];
  for (const p of positions) {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(p[0], 2.9, p[1]);
    group.add(leg);
  }
  return group;
}

function makeTumbleweed() {
  const geo = new THREE.IcosahedronGeometry(0.4, 1);
  const edges = new THREE.EdgesGeometry(geo);
  const mat = new THREE.LineBasicMaterial({ color: 0x8a6f3d });
  const weed = new THREE.LineSegments(edges, mat);
  weed.visible = false;
  return weed;
}

export function createArena(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd9ff);
  scene.fog = new THREE.Fog(0xe8d3a8, 60, 220);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);
  const playerRig = new THREE.Group();
  playerRig.position.set(0, 1.6, 7);
  playerRig.add(camera);
  scene.add(playerRig);

  const hemi = new THREE.HemisphereLight(0xffe8c0, 0x8a6a45, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
  sun.position.set(24, 34, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);
  const moon = new THREE.DirectionalLight(0x8fb4ff, 0);
  moon.position.set(-18, 28, -10);
  scene.add(moon);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(9, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false })
  );
  sunDisc.position.set(60, 70, -160);
  sunDisc.lookAt(0, 1.6, 7);
  scene.add(sunDisc);

  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(5, 24),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false })
  );
  moonDisc.position.set(-70, 60, -150);
  moonDisc.lookAt(0, 1.6, 7);
  moonDisc.visible = false;
  scene.add(moonDisc);

  const impactTargets = [ground];

  const town = buildTown(scene, impactTargets);
  const interiors = createInteriors(scene);

  const cactusSpots = [
    [-16, -40], [18, -36], [-20, 14], [22, 20], [-15, 30], [17, -55]
  ];
  for (const spot of cactusSpots) {
    const cactus = makeCactus(0.8 + Math.random() * 0.6);
    cactus.position.set(spot[0], 0, spot[1]);
    scene.add(cactus);
  }

  const barrelSpots = [
    [-6.2, -3], [-6.4, -1.8], [6.3, 2], [6.1, -9]
  ];
  for (const spot of barrelSpots) {
    const barrel = makeBarrel();
    barrel.position.set(spot[0], 0, spot[1]);
    scene.add(barrel);
    impactTargets.push(barrel);
  }

  const tower = makeWaterTower();
  tower.position.set(14, 0, -34);
  scene.add(tower);

  const opponentAnchor = new THREE.Group();
  opponentAnchor.position.set(0, 0, -7);
  scene.add(opponentAnchor);

  const weed = makeTumbleweed();
  scene.add(weed);
  const weedPaths = [
    // Through alleys: left gap → right gap (slight diagonal)
    { sx: -14, sz: -10.85, ex: 14, ez: -7.35 },
    { sx: -14, sz: -21.5, ex: 14, ez: -16.9 },
    // Reverse: right gap → left gap
    { sx: 14, sz: -7.35, ex: -14, ez: -10.85 },
    { sx: 14, sz: -16.9, ex: -14, ez: -21.5 },
    // Open areas above/below the town
    { sx: -14, sz: 13, ex: 14, ez: 13 },
    { sx: 14, sz: -30, ex: -14, ez: -30 }
  ];
  const weedState = { active: false, nextAt: 2 + Math.random() * 6, x: 0, z: 0, dx: 0, dz: 0 };

  let windy = false;
  let elapsed = 0;
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xd8b98a, transparent: true, opacity: 0.5 });
  const dustGeo = new THREE.BoxGeometry(1, 0.02, 0.02);
  const dusts = [];
  for (let i = 0; i < 70; i++) {
    const streak = new THREE.Mesh(dustGeo, dustMat);
    streak.visible = false;
    scene.add(streak);
    dusts.push({ mesh: streak, speed: 0, baseY: 0, phase: Math.random() * 10, active: false });
  }

  function resetDust(d, fresh) {
    d.active = true;
    d.speed = 9 + Math.random() * 8;
    d.baseY = 0.15 + Math.random() * 2.4;
    d.mesh.visible = true;
    d.mesh.scale.x = 0.6 + Math.random() * 1.3;
    d.mesh.position.set(fresh ? -32 - Math.random() * 6 : -32 + Math.random() * 64, d.baseY, -34 + Math.random() * 54);
  }
  let isFoggy = false;
  let fogFarNormal = 22;
  let fogFarThick = 22;
  let fogPulseAmount = 0;

  const bursts = [];
  const chipGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);

  function castEnvironment(raycaster) {
    const hits = raycaster.intersectObjects(impactTargets, true);
    if (hits.length === 0) {
      return null;
    }
    const hit = hits[0];
    let kind = "wood";
    if (hit.object === ground) {
      kind = "dust";
    }
    return { point: hit.point, kind: kind };
  }

  function spawnImpact(point, kind) {
    let color = 0x6b4a26;
    let count = 7;
    let speed = 2.4;
    if (kind === "dust") {
      color = 0xcfa36a;
      count = 9;
      speed = 1.6;
    }
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.95 });
    const parts = [];
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(chipGeo, material);
      mesh.position.copy(point);
      const scale = 0.5 + Math.random() * 0.9;
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      parts.push({
        mesh: mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * speed * 2,
          Math.random() * speed * 1.4 + 0.6,
          (Math.random() - 0.5) * speed * 2
        ),
        spin: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4)
      });
    }
    bursts.push({ parts: parts, material: material, life: 0, maxLife: 0.75 });
  }

  function updateBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i];
      burst.life += dt;
      const fade = 1 - burst.life / burst.maxLife;
      if (fade <= 0) {
        for (const part of burst.parts) {
          scene.remove(part.mesh);
        }
        burst.material.dispose();
        bursts.splice(i, 1);
        continue;
      }
      burst.material.opacity = fade * 0.95;
      for (const part of burst.parts) {
        part.vel.y -= 7.5 * dt;
        part.mesh.position.addScaledVector(part.vel, dt);
        if (part.mesh.position.y < 0.02) {
          part.mesh.position.y = 0.02;
          part.vel.set(0, 0, 0);
        }
        part.mesh.rotation.x += part.spin.x * dt;
        part.mesh.rotation.y += part.spin.y * dt;
        part.mesh.rotation.z += part.spin.z * dt;
      }
    }
  }

  function applyModifier(mod, distanceMeters) {
    windy = mod.sway > 0;
    opponentAnchor.position.z = 7 - distanceMeters;
    isFoggy = mod.id === "fog";
    fogPulseAmount = 0;
    if (mod.id === "dusk") {
      scene.background = new THREE.Color(0x121a30);
      scene.fog = new THREE.Fog(0x121a30, 30, 120);
      hemi.intensity = 0.18;
      sun.intensity = 0;
      moon.intensity = 0.5;
      sunDisc.visible = false;
      moonDisc.visible = true;
    } else if (mod.id === "fog") {
      scene.background = new THREE.Color(0xd8cdb4);
      fogFarNormal = Math.max(distanceMeters + 10, 22);
      fogFarThick = Math.max(distanceMeters * 0.4, 6);
      scene.fog = new THREE.Fog(0xd8cdb4, 3, fogFarNormal);
      hemi.intensity = 0.7;
      sun.intensity = 0.8;
      moon.intensity = 0;
      sunDisc.visible = false;
      moonDisc.visible = false;
    } else {
      scene.background = new THREE.Color(0x9fd9ff);
      scene.fog = new THREE.Fog(0xe8d3a8, 60, 220);
      hemi.intensity = 0.9;
      sun.intensity = 2.2;
      moon.intensity = 0;
      sunDisc.visible = true;
      moonDisc.visible = false;
    }
  }

  function setFogPulse(active, dt) {
    if (!isFoggy) {
      return;
    }
    let target = 0;
    if (active) {
      target = 1;
    }
    fogPulseAmount += (target - fogPulseAmount) * Math.min(1, dt * 3);
    const far = fogFarNormal + (fogFarThick - fogFarNormal) * fogPulseAmount;
    scene.fog.far = far;
  }

  function update(dt) {
    elapsed += dt;
    updateBursts(dt);
    for (const d of dusts) {
      if (windy) {
        if (!d.active) {
          resetDust(d, false);
        }
        d.mesh.position.x += d.speed * dt;
        d.mesh.position.y = d.baseY + Math.sin(elapsed * 2.2 + d.phase) * 0.25;
        if (d.mesh.position.x > 34) {
          resetDust(d, true);
        }
      } else if (d.active) {
        d.active = false;
        d.mesh.visible = false;
      }
    }
    town.update(dt);
    interiors.update(dt);
    let interval = 8;
    if (windy) {
      interval = 2.5;
    }
    if (!weedState.active) {
      weedState.nextAt -= dt;
      if (weedState.nextAt <= 0) {
        weedState.active = true;
        const path = weedPaths[Math.floor(Math.random() * weedPaths.length)];
        weedState.x = path.sx;
        weedState.z = path.sz;
        const pdx = path.ex - path.sx;
        const pdz = path.ez - path.sz;
        const len = Math.sqrt(pdx * pdx + pdz * pdz);
        weedState.dx = pdx / len;
        weedState.dz = pdz / len;
        weed.visible = true;
      }
    } else {
      let speed = 4;
      if (windy) {
        speed = 9;
      }
      weedState.x += speed * dt * weedState.dx;
      weedState.z += speed * dt * weedState.dz;
      weed.position.set(weedState.x, 0.4 + Math.abs(Math.sin(elapsed * 6)) * 0.15, weedState.z);
      weed.rotation.z -= speed * dt * weedState.dx;
      if (Math.abs(weedState.x) > 15) {
        weedState.active = false;
        weed.visible = false;
        weedState.nextAt = interval * (0.5 + Math.random());
      }
    }
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  return {
    renderer: renderer,
    scene: scene,
    camera: camera,
    playerRig: playerRig,
    opponentAnchor: opponentAnchor,
    sunDisc: sunDisc,
    anchors: town.anchors,
    interactables: town.interactables,
    interiors: interiors,
    setTownLabels: town.setLabels,
      setWalkersVisible: town.setWalkersVisible,
    setRangeProps: town.setRangeProps,
    refreshBoard: town.refreshBoard,
    applyModifier: applyModifier,
    setFogPulse: setFogPulse,
    castEnvironment: castEnvironment,
    spawnImpact: spawnImpact,
    update: update
  };
}
