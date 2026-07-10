import * as THREE from "three";
import { createCowboy } from "./cowboy.js";

function mat(color, roughness) {
  return new THREE.MeshStandardMaterial({ color: color, roughness: roughness || 0.9 });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function signTexture(text, big) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  function draw() {
    ctx.fillStyle = "#4a2f15";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#2c1a0a";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 118);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "rgba(30, 18, 8, 0.35)";
      ctx.fillRect(i * 86, 12, 3, 104);
    }
    ctx.fillStyle = "#e8c87a";
    ctx.font = (big ? "68px" : "56px") + " Rye, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 68);
    tex.needsUpdate = true;
  }
  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw);
  }
  return tex;
}

function wantedTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  function draw() {
    ctx.fillStyle = "#e4d3a8";
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = "#2c1a0a";
    ctx.font = "44px Rye, serif";
    ctx.textAlign = "center";
    ctx.fillText("WANTED", 128, 56);
    ctx.fillStyle = "#8a6a3c";
    ctx.fillRect(58, 84, 140, 130);
    ctx.fillStyle = "#5a4020";
    ctx.fillRect(88, 108, 80, 60);
    ctx.fillRect(103, 172, 50, 42);
    ctx.fillStyle = "#2c1a0a";
    ctx.font = "26px Rye, serif";
    ctx.fillText("$5000", 128, 258);
    ctx.font = "18px 'Special Elite', serif";
    ctx.fillText("DEAD OR ALIVE", 128, 292);
    tex.needsUpdate = true;
  }
  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw);
  }
  return tex;
}

function makeBuilding(spec) {
  const group = new THREE.Group();
  const body = box(spec.w, spec.h, 6, mat(spec.color));
  body.position.y = spec.h / 2;
  group.add(body);
  const facade = box(spec.w * 0.96, spec.h * 0.42, 0.12, mat(0x3a2a18, 1));
  facade.position.set(0, spec.h * 0.86, 3.06);
  group.add(facade);
  const trimMat = mat(0x2c1c0c, 1);
  const trim = box(spec.w, 0.14, 0.16, trimMat);
  trim.position.set(0, spec.h * 1.07, 3.05);
  group.add(trim);

  const doorMat = mat(0x241608, 1);
  const door = box(0.9, 1.9, 0.08, doorMat);
  door.position.set(spec.doorX || 0, 0.95, 3.04);
  group.add(door);

  const winMat = mat(0x121a24, 0.4);
  const frameMat = mat(0x5a4020, 1);
  const winXs = spec.windows || [-spec.w * 0.3, spec.w * 0.3];
  for (const wx of winXs) {
    if (Math.abs(wx - (spec.doorX || 0)) < 0.8) {
      continue;
    }
    const frame = box(0.84, 1.08, 0.06, frameMat);
    frame.position.set(wx, 1.55, 3.03);
    group.add(frame);
    const win = box(0.7, 0.94, 0.08, winMat);
    win.position.set(wx, 1.55, 3.04);
    group.add(win);
    if (spec.h > 6.5) {
      const frame2 = box(0.84, 1.08, 0.06, frameMat);
      frame2.position.set(wx, spec.h * 0.62, 3.03);
      group.add(frame2);
      const win2 = box(0.7, 0.94, 0.08, winMat);
      win2.position.set(wx, spec.h * 0.62, 3.04);
      group.add(win2);
    }
  }

  const porch = box(spec.w, 0.16, 2.2, mat(0x6b4a26, 1));
  porch.position.set(0, 0.08, 4.1);
  group.add(porch);

  const awning = box(spec.w * 0.94, 0.1, 2, mat(0x5c3a1d, 1));
  awning.position.set(0, spec.h * 0.44, 4);
  group.add(awning);
  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, spec.h * 0.44, 6);
  const postMat = mat(0x4a3018, 1);
  for (const ox of [-spec.w * 0.42, spec.w * 0.42]) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(ox, spec.h * 0.22, 4.85);
    post.castShadow = true;
    group.add(post);
  }

  if (spec.sign) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(spec.w * 0.86, 5.6), 1.1),
      new THREE.MeshStandardMaterial({ map: signTexture(spec.sign, spec.w > 8), roughness: 0.9 })
    );
    sign.position.set(0, spec.h * 0.86, 3.14);
    group.add(sign);
  }

  if (spec.saloon) {
    const doorL = box(0.42, 1.1, 0.05, mat(0x6b4a26, 1));
    doorL.position.set(-0.24, 1.05, 3.1);
    group.add(doorL);
    const doorR = box(0.42, 1.1, 0.05, mat(0x6b4a26, 1));
    doorR.position.set(0.24, 1.05, 3.1);
    group.add(doorR);
  }

  return group;
}

function makeHorse() {
  const group = new THREE.Group();
  const coat = mat(0x5c3a22);
  const dark = mat(0x35230f);
  const body = box(0.52, 0.6, 1.35, coat);
  body.position.y = 1.15;
  group.add(body);
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 1.35, 0.6);
  group.add(neckPivot);
  const neck = box(0.3, 0.72, 0.34, coat);
  neck.position.set(0, 0.3, 0.1);
  neck.rotation.x = 0.45;
  neckPivot.add(neck);
  const head = box(0.26, 0.3, 0.62, coat);
  head.position.set(0, 0.66, 0.4);
  neckPivot.add(head);
  const muzzle = box(0.2, 0.22, 0.24, dark);
  muzzle.position.set(0, 0.62, 0.74);
  neckPivot.add(muzzle);
  for (const side of [-1, 1]) {
    const ear = box(0.06, 0.16, 0.06, coat);
    ear.position.set(side * 0.09, 0.86, 0.28);
    neckPivot.add(ear);
  }
  const mane = box(0.08, 0.6, 0.2, dark);
  mane.position.set(0, 0.38, -0.08);
  mane.rotation.x = 0.45;
  neckPivot.add(mane);
  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.13, 0.88, 0.15);
  for (const spot of [[-0.18, 0.5], [0.18, 0.5], [-0.18, -0.52], [0.18, -0.52]]) {
    const leg = new THREE.Mesh(legGeo, coat);
    leg.castShadow = true;
    leg.position.set(spot[0], 0.44, spot[1]);
    group.add(leg);
    legs.push(leg);
  }
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.32, -0.68);
  group.add(tailPivot);
  const tail = box(0.1, 0.62, 0.1, dark);
  tail.position.y = -0.28;
  tailPivot.add(tail);
  group.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });
  return { group: group, neck: neckPivot, tail: tailPivot, legs: legs, phase: Math.random() * 10 };
}

function makeHitchRail(width) {
  const group = new THREE.Group();
  const woodMat = mat(0x4a3018, 1);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, width, 6), woodMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.y = 0.85;
  rail.castShadow = true;
  group.add(rail);
  for (const ox of [-width / 2 + 0.1, width / 2 - 0.1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6), woodMat);
    post.position.set(ox, 0.45, 0);
    post.castShadow = true;
    group.add(post);
  }
  return group;
}

function makeWantedBoard() {
  const group = new THREE.Group();
  const woodMat = mat(0x4a3018, 1);
  const board = box(1.7, 1.5, 0.1, mat(0x5c3a1d, 1));
  board.position.y = 1.85;
  group.add(board);
  for (const ox of [-0.7, 0.7]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6), woodMat);
    post.position.set(ox, 1.25, -0.02);
    post.castShadow = true;
    group.add(post);
  }
  const roof = box(2, 0.08, 0.5, woodMat);
  roof.position.set(0, 2.7, 0.1);
  roof.rotation.x = 0.25;
  group.add(roof);
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.8),
    new THREE.MeshStandardMaterial({ map: wantedTexture(), roughness: 1 })
  );
  poster.position.set(-0.4, 1.9, 0.06);
  poster.rotation.z = 0.03;
  group.add(poster);
  const poster2 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.8),
    new THREE.MeshStandardMaterial({ map: wantedTexture(), roughness: 1 })
  );
  poster2.position.set(0.42, 1.82, 0.06);
  poster2.rotation.z = -0.05;
  group.add(poster2);
  return group;
}

function makeRockingChair() {
  const group = new THREE.Group();
  const woodMat = mat(0x5c3a1d, 1);
  const seat = box(0.5, 0.06, 0.45, woodMat);
  seat.position.y = 0.4;
  group.add(seat);
  const back = box(0.5, 0.55, 0.06, woodMat);
  back.position.set(0, 0.68, -0.2);
  back.rotation.x = -0.2;
  group.add(back);
  for (const spot of [[-0.21, 0.18], [0.21, 0.18], [-0.21, -0.18], [0.21, -0.18]]) {
    const leg = box(0.05, 0.34, 0.05, woodMat);
    leg.position.set(spot[0], 0.2, spot[1]);
    group.add(leg);
  }
  for (const ox of [-0.22, 0.22]) {
    const rocker = box(0.05, 0.05, 0.7, woodMat);
    rocker.position.set(ox, 0.03, 0);
    group.add(rocker);
  }
  return group;
}

function makeCrate() {
  const crate = box(0.6, 0.6, 0.6, mat(0x8a6a3c, 1));
  crate.position.y = 0.3;
  return crate;
}

function makeTrough() {
  const group = new THREE.Group();
  const body = box(1.5, 0.42, 0.6, mat(0x4a3018, 1));
  body.position.y = 0.21;
  group.add(body);
  const water = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.04, 0.46), mat(0x2c4a5a, 0.3));
  water.position.y = 0.38;
  group.add(water);
  return group;
}

function makeWagonWheel() {
  const group = new THREE.Group();
  const woodMat = mat(0x5c3a1d, 1);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 18), woodMat);
  group.add(rim);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.04, 6), woodMat);
    spoke.rotation.z = (i / 4) * Math.PI;
    group.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8), woodMat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  group.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });
  return group;
}

const NPC_SKINS = [
  { skin: 0xb5825a, shirt: 0x4a5a6b, pants: 0x3a3026, hat: 0x2c2c30, bandana: 0x8a8f98 },
  { skin: 0xc98f5e, shirt: 0x6b4a26, pants: 0x2c3a2c, hat: 0x5a4020, bandana: 0xa84632 },
  { skin: 0xa9744a, shirt: 0x7a6248, pants: 0x30425c, hat: 0x4a3018, bandana: 0xd8c48a }
];

export function buildTown(scene, impactTargets, hooks) {
  const group = new THREE.Group();
  scene.add(group);

  const buildings = [
    { x: -9.5, z: 2, ry: Math.PI / 2, w: 7, h: 5.6, color: 0x74522f, sign: "SHERIFF", doorX: -1.2 },
    { x: -9.5, z: -6, ry: Math.PI / 2, w: 8.4, h: 6, color: 0x8a5a2e, sign: "GENERAL STORE", doorX: 0 },
    { x: -9.5, z: -16, ry: Math.PI / 2, w: 9, h: 8, color: 0x9c6b38, sign: "HOTEL", doorX: 0, windows: [-3, -1.5, 1.5, 3] },
    { x: -9.5, z: -26, ry: Math.PI / 2, w: 7, h: 6.2, color: 0x6b4a26, sign: "BANK", doorX: 0 },
    { x: 9.5, z: -2, ry: -Math.PI / 2, w: 9, h: 7, color: 0x84603a, sign: "SALOON", doorX: 0, saloon: true, windows: [-2.8, 2.8] },
    { x: 9.5, z: -12, ry: -Math.PI / 2, w: 7.6, h: 5.4, color: 0x74522f, sign: "GUNSMITH", doorX: 1 },
    { x: 9.5, z: -22, ry: -Math.PI / 2, w: 8, h: 6.4, color: 0x8a5a2e, sign: "TELEGRAPH", doorX: -1.4 },
    { x: 9.5, z: 8, ry: -Math.PI / 2, w: 8.6, h: 5.2, color: 0x6b4a26, sign: "STABLE", doorX: 0 },
    { x: -19.5, z: -2, ry: Math.PI / 2, w: 7, h: 4.6, color: 0x74522f },
    { x: -19.5, z: -11, ry: Math.PI / 2, w: 8, h: 5.2, color: 0x84603a },
    { x: -19.5, z: -21, ry: Math.PI / 2, w: 7.4, h: 4.4, color: 0x9c6b38 },
    { x: 19.5, z: -7, ry: -Math.PI / 2, w: 7.8, h: 4.8, color: 0x8a5a2e },
    { x: 19.5, z: -17, ry: -Math.PI / 2, w: 7, h: 5.6, color: 0x74522f },
    { x: 19.5, z: 3, ry: -Math.PI / 2, w: 7.2, h: 4.4, color: 0x9c6b38 }
  ];
  for (const spec of buildings) {
    const building = makeBuilding(spec);
    building.position.set(spec.x, 0, spec.z);
    building.rotation.y = spec.ry;
    group.add(building);
    impactTargets.push(building);
  }

  const board = makeWantedBoard();
  board.position.set(-5.8, 0, 8.5);
  board.rotation.y = 0.15;
  group.add(board);

  const screenMat = mat(0x8a4632, 1);
  const paravent = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const panel = box(0.72, 1.7, 0.05, screenMat);
    panel.position.set((i - 1) * 0.68, 0.85, i === 1 ? 0 : 0.18);
    panel.rotation.y = (i - 1) * -0.5;
    paravent.add(panel);
  }
  paravent.position.set(-7.1, 0, -13.2);
  paravent.rotation.y = 1.15;
  group.add(paravent);

  const mirror = new THREE.Group();
  const mirrorFrame = box(0.66, 1.5, 0.06, mat(0x5c3a1d, 1));
  mirrorFrame.position.y = 1.15;
  mirror.add(mirrorFrame);
  const mirrorGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 1.36, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xb8ccd8, roughness: 0.15, metalness: 0.7 })
  );
  mirrorGlass.position.set(0, 1.15, 0.03);
  mirror.add(mirrorGlass);
  const mirrorFootL = box(0.1, 0.06, 0.4, mat(0x5c3a1d, 1));
  mirrorFootL.position.set(-0.24, 0.03, 0);
  mirror.add(mirrorFootL);
  const mirrorFootR = box(0.1, 0.06, 0.4, mat(0x5c3a1d, 1));
  mirrorFootR.position.set(0.24, 0.03, 0);
  mirror.add(mirrorFootR);
  mirror.position.set(-7, 0, -15.1);
  mirror.rotation.y = 1.35;
  group.add(mirror);

  const lanternSpots = [[-6.2, 2.5, -6], [-6.2, 2.3, -14.1], [6.2, 2.5, -2]];
  for (const spot of lanternSpots) {
    const lantern = new THREE.PointLight(0xffc27a, 0.55, 9);
    lantern.position.set(spot[0], spot[1], spot[2]);
    group.add(lantern);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    bulb.position.set(spot[0], spot[1], spot[2]);
    group.add(bulb);
  }

  const chair = makeRockingChair();
  chair.position.set(6.2, 0.16, 1.4);
  chair.rotation.y = -Math.PI / 2 - 0.3;
  group.add(chair);

  const trough = makeTrough();
  trough.position.set(6.4, 0, 6.4);
  trough.rotation.y = 0.2;
  group.add(trough);

  const wheelProp = makeWagonWheel();
  wheelProp.position.set(-6.9, 0.56, -2.6);
  wheelProp.rotation.set(0, 0.5, 0.32);
  group.add(wheelProp);

  for (const spot of [[-6.6, -8.9], [-6.2, -8.2], [6.5, -14.5]]) {
    const crate = makeCrate();
    crate.position.set(spot[0], crate.position.y, spot[1]);
    crate.rotation.y = Math.random() * 1.5;
    group.add(crate);
    impactTargets.push(crate);
  }

  const railSaloon = makeHitchRail(3);
  railSaloon.position.set(6.6, 0, -4.6);
  railSaloon.rotation.y = Math.PI / 2;
  group.add(railSaloon);
  const railStable = makeHitchRail(3);
  railStable.position.set(6.6, 0, 9.4);
  railStable.rotation.y = Math.PI / 2;
  group.add(railStable);

  const horses = [];
  const horseA = makeHorse();
  horseA.group.position.set(7.6, 0, -4.6);
  horseA.group.rotation.y = -Math.PI / 2;
  group.add(horseA.group);
  horses.push(horseA);
  const horseB = makeHorse();
  horseB.group.position.set(7.6, 0, 9.6);
  horseB.group.rotation.y = -Math.PI / 2 + 0.3;
  group.add(horseB.group);
  horses.push(horseB);

  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 9.6, 4), mat(0xd8c48a, 1));
  rope.rotation.x = Math.PI / 2;
  rope.position.set(14.5, 3.6, -2);
  group.add(rope);
  const cloths = [];
  const clothColors = [0xd8c48a, 0x8a4632, 0x4a5a6b];
  for (let i = 0; i < 3; i++) {
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 1),
      new THREE.MeshStandardMaterial({ color: clothColors[i], roughness: 1, side: THREE.DoubleSide })
    );
    cloth.position.set(14.5, 3.1, -5 + i * 2.6);
    cloth.rotation.y = Math.PI / 2;
    group.add(cloth);
    cloths.push(cloth);
  }

  const smokeParts = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xcfc6b8, transparent: true, opacity: 0.4 });
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), smokeMat.clone());
    puff.position.set(11.2, 7.6, -4.4);
    group.add(puff);
    smokeParts.push({ mesh: puff, t: i / 5 });
  }

  const crows = [];
  for (let i = 0; i < 3; i++) {
    const bird = new THREE.Group();
    const wingMat = mat(0x1a140c, 1);
    const wingL = box(0.5, 0.03, 0.16, wingMat);
    wingL.position.x = -0.26;
    const wingR = box(0.5, 0.03, 0.16, wingMat);
    wingR.position.x = 0.26;
    const bodyMesh = box(0.16, 0.1, 0.3, wingMat);
    bird.add(wingL);
    bird.add(wingR);
    bird.add(bodyMesh);
    group.add(bird);
    crows.push({ group: bird, wingL: wingL, wingR: wingR, angle: (i / 3) * Math.PI * 2, radius: 16 + i * 4, height: 16 + i * 3, speed: 0.14 + i * 0.03 });
  }

  const walkers = [];
  const walkerPaths = [
    { from: new THREE.Vector3(-6.9, 0, 6), to: new THREE.Vector3(-6.9, 0, -22), speed: 1.15 },
    { from: new THREE.Vector3(6.9, 0, -18), to: new THREE.Vector3(6.9, 0, 4), speed: 1.0 }
  ];
  for (let i = 0; i < walkerPaths.length; i++) {
    const npc = createCowboy();
    npc.setSkin(NPC_SKINS[i % NPC_SKINS.length]);
    npc.setWalk(true);
    npc.group.position.copy(walkerPaths[i].from);
    scene.add(npc.group);
    walkers.push({ cowboy: npc, path: walkerPaths[i], t: Math.random(), dir: 1 });
  }

  let elapsed = 0;
  let nextWhinny = 14 + Math.random() * 20;

  function update(dt) {
    elapsed += dt;

    for (const horse of horses) {
      horse.phase += dt;
      horse.neck.rotation.x = Math.sin(horse.phase * 0.7) * 0.09 + Math.max(0, Math.sin(horse.phase * 0.13)) * 0.35;
      horse.tail.rotation.z = Math.sin(horse.phase * 1.7) * 0.4;
      horse.tail.rotation.x = Math.sin(horse.phase * 1.1) * 0.15;
    }
    nextWhinny -= dt;
    if (nextWhinny <= 0) {
      nextWhinny = 20 + Math.random() * 30;
      if (hooks && hooks.onWhinny) {
        hooks.onWhinny();
      }
    }

    for (const cloth of cloths) {
      cloth.rotation.x = Math.sin(elapsed * 1.8 + cloth.position.z) * 0.22;
    }

    chair.rotation.x = Math.sin(elapsed * 1.2) * 0.06;

    for (const puff of smokeParts) {
      puff.t += dt * 0.14;
      if (puff.t > 1) {
        puff.t -= 1;
      }
      puff.mesh.position.y = 7.4 + puff.t * 3.4;
      puff.mesh.position.x = 11.2 + Math.sin(puff.t * 5) * 0.4 + puff.t * 0.7;
      const scale = 0.6 + puff.t * 1.6;
      puff.mesh.scale.setScalar(scale);
      puff.mesh.material.opacity = 0.32 * (1 - puff.t);
    }

    for (const crow of crows) {
      crow.angle += dt * crow.speed;
      crow.group.position.set(
        Math.cos(crow.angle) * crow.radius,
        crow.height + Math.sin(crow.angle * 3) * 0.8,
        -8 + Math.sin(crow.angle) * crow.radius
      );
      crow.group.rotation.y = -crow.angle + Math.PI;
      const flap = Math.sin(elapsed * 9 + crow.radius) * 0.55;
      crow.wingL.rotation.z = flap;
      crow.wingR.rotation.z = -flap;
    }

    for (const walker of walkers) {
      const path = walker.path;
      const len = path.from.distanceTo(path.to);
      walker.t += (dt * path.speed * walker.dir) / len;
      if (walker.t >= 1) {
        walker.t = 1;
        walker.dir = -1;
      } else if (walker.t <= 0) {
        walker.t = 0;
        walker.dir = 1;
      }
      walker.cowboy.group.position.lerpVectors(path.from, path.to, walker.t);
      const dz = (path.to.z - path.from.z) * walker.dir;
      walker.cowboy.group.rotation.y = dz >= 0 ? 0 : Math.PI;
      walker.cowboy.update(dt);
    }
  }

  const anchors = {
    home: {
      spot: new THREE.Vector3(1.7, 0, 1.6),
      face: Math.PI * 0.9,
      cam: new THREE.Vector3(-2.3, 1.9, 5.6),
      look: new THREE.Vector3(1.5, 1.15, 0.2)
    },
    road: {
      spot: new THREE.Vector3(0, 0, -7.5),
      face: Math.PI,
      cam: new THREE.Vector3(2.6, 2.1, -2.6),
      look: new THREE.Vector3(-0.4, 1.2, -9)
    },
    store: {
      spot: new THREE.Vector3(-5.6, 0, -6),
      face: -Math.PI / 2,
      cam: new THREE.Vector3(-1.6, 1.8, -3.2),
      look: new THREE.Vector3(-7.6, 1.6, -6.4)
    },
    board: {
      spot: new THREE.Vector3(-4.9, 0, 9.4),
      face: -2.3,
      cam: new THREE.Vector3(-4.2, 1.7, 11.6),
      look: new THREE.Vector3(-4.3, 1.7, 8.4)
    },
    wardrobe: {
      spot: new THREE.Vector3(-6.2, 0, -13.6),
      face: Math.PI / 2,
      cam: new THREE.Vector3(-2.6, 1.6, -14.6),
      look: new THREE.Vector3(-6.4, 1.0, -14.9)
    },
    saloon: {
      spot: new THREE.Vector3(5.4, 0, -2),
      face: Math.PI / 2,
      cam: new THREE.Vector3(1.8, 1.8, 0.4),
      look: new THREE.Vector3(7.4, 1.6, -2.4)
    }
  };

  return {
    update: update,
    anchors: anchors
  };
}
