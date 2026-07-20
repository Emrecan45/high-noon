import * as THREE from "three";
import { createCowboy } from "./cowboy.js";
import { portraitDataUrl, aiSkinFor } from "./skins.js";
import { drawWantedPoster } from "./wanted.js";

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
    let size = big ? 68 : 56;
    ctx.font = size + "px Rye, serif";
    while (ctx.measureText(text).width > 460 && size > 26) {
      size -= 3;
      ctx.font = size + "px Rye, serif";
    }
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
  if (spec.hollow) {
    const wallMat = mat(spec.color);
    const back = box(spec.w, spec.h, 0.25, wallMat);
    back.position.set(0, spec.h / 2, -2.88);
    group.add(back);
    for (const sx of [-1, 1]) {
      const sideWall = box(0.25, spec.h, 6, wallMat);
      sideWall.position.set(sx * (spec.w / 2 - 0.125), spec.h / 2, 0);
      group.add(sideWall);
    }
    const doorW = 1.05;
    const doorH = 2.1;
    const dx = spec.doorX || 0;
    const leftW = spec.w / 2 + dx - doorW / 2;
    const rightW = spec.w / 2 - dx - doorW / 2;
    const frontL = box(leftW, spec.h, 0.25, wallMat);
    frontL.position.set(-spec.w / 2 + leftW / 2, spec.h / 2, 2.88);
    group.add(frontL);
    const frontR = box(rightW, spec.h, 0.25, wallMat);
    frontR.position.set(spec.w / 2 - rightW / 2, spec.h / 2, 2.88);
    group.add(frontR);
    const lintel = box(doorW, spec.h - doorH, 0.25, wallMat);
    lintel.position.set(dx, doorH + (spec.h - doorH) / 2, 2.88);
    group.add(lintel);
    const roofSlab = box(spec.w, 0.22, 6, wallMat);
    roofSlab.position.set(0, spec.h - 0.11, 0);
    group.add(roofSlab);
  } else {
    const body = box(spec.w, spec.h, 6, mat(spec.color));
    body.position.y = spec.h / 2;
    group.add(body);
  }
  const facade = box(spec.w * 0.96, spec.h * 0.42, 0.12, mat(0x3a2a18, 1));
  facade.position.set(0, spec.h * 0.86, 3.06);
  group.add(facade);
  const trimMat = mat(0x2c1c0c, 1);
  const trim = box(spec.w, 0.14, 0.16, trimMat);
  trim.position.set(0, spec.h * 1.07, 3.05);
  group.add(trim);

  if (!spec.noDoor) {
    const doorMat = mat(0x241608, 1);
    const door = box(0.9, 1.9, 0.08, doorMat);
    const dx = spec.doorX || 0;
    door.position.set(dx, 0.95, 3.04);
    group.add(door);
    
    if (!spec.saloon) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), mat(0xc7a34a, 1));
      knob.position.set(dx + 0.35, 0.95, 3.1);
      group.add(knob);
    }
  }

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

function makeHorse(coatColor, darkColor) {
  const group = new THREE.Group();
  const coat = mat(coatColor || 0x5c3a22);
  const dark = mat(darkColor || 0x35230f);
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

  const saddleMat = mat(0x3d2817);
  const saddle = box(0.56, 0.12, 0.5, saddleMat);
  saddle.position.set(0, 1.48, 0.1);
  group.add(saddle);
  const stirrupR = box(0.05, 0.55, 0.12, saddleMat);
  stirrupR.position.set(0.28, 1.15, 0.1);
  group.add(stirrupR);
  const stirrupL = box(0.05, 0.55, 0.12, saddleMat);
  stirrupL.position.set(-0.28, 1.15, 0.1);
  group.add(stirrupL);

  group.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });
    return {
      group: group,
      neck: neckPivot,
      tail: tailPivot,
      legs: legs,
      phase: Math.random() * 10
    };
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

function makeLeaderBoard() {
  const group = new THREE.Group();
  const woodMat = mat(0x4a3018, 1);
  const board = box(3.1, 3.5, 0.1, mat(0x5c3a1d, 1));
  board.position.y = 2.05;
  group.add(board);
  for (const ox of [-1.4, 1.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.9, 6), woodMat);
    post.position.set(ox, 1.95, -0.02);
    post.castShadow = true;
    group.add(post);
  }
  const roof = box(3.5, 0.09, 0.55, woodMat);
  roof.position.set(0, 3.94, 0.06);
  roof.rotation.x = 0.25;
  group.add(roof);

  const lanternObj = new THREE.Group();
  lanternObj.position.set(0, 3.65, 0.28);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
  lanternObj.add(bulb);
  const lanternLight = new THREE.PointLight(0xffc27a, 0.8, 15, 1.0);
  lanternObj.add(lanternLight);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), mat(0x2c2c30, 1));
  hook.position.y = 0.1;
  lanternObj.add(hook);
  group.add(lanternObj);

  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = 1680;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  let seq = 0;

  function drawPoster(info, rank, cx, cy, k, tilt) {
    const my = seq;
    drawWantedPoster(ctx, {
      cx: cx,
      cy: cy,
      w: 200 * k,
      tilt: tilt,
      rank: rank,
      pseudo: info ? info.pseudo : null,
      bounty: info ? info.prime : null,
      skin: info ? info.skin : "drifter",
      acc: info ? info.acc : null,
      weapon: info ? info.weapon : null,
      valid: function () { return my === seq; },
      onReady: function () { tex.needsUpdate = true; }
    });
  }

  function posterInfo(row) {
    if (!row) {
      return null;
    }
    return { pseudo: row.pseudo, prime: row.prime, skin: row.skin, acc: row.accessories };
  }

  tex.userData.draw = function (title, rows, sub) {
    seq += 1;
    ctx.fillStyle = "#d9c79b";
    ctx.fillRect(0, 0, 720, 840);
    ctx.strokeStyle = "#5c3a1d";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 700, 820);
    ctx.fillStyle = "#6b4423";
    ctx.textAlign = "center";
    let titleSize = 52;
    ctx.font = "bold 52px 'Rye', serif";
    while (ctx.measureText(title).width > 620 && titleSize > 28) {
      titleSize -= 2;
      ctx.font = "bold " + titleSize + "px 'Rye', serif";
    }
    ctx.fillText(title, 360, 74);
    if (sub) {
      ctx.fillStyle = "#8a6a3c";
      ctx.font = "22px 'Special Elite', serif";
      ctx.fillText(sub, 360, 108);
    }
    const list = Array.isArray(rows) ? rows : [];
    if (list[1]) drawPoster(posterInfo(list[1]), 2, 140, 330, 0.9, 0.03);
    if (list[2]) drawPoster(posterInfo(list[2]), 3, 580, 352, 0.8, -0.03);
    if (list[0]) drawPoster(posterInfo(list[0]), 1, 360, 294, 1.05, 0);
    ctx.textAlign = "left";
    for (let i = 3; i < list.length && i < 10; i++) {
      const y = 532 + (i - 3) * 42;
      ctx.fillStyle = "#4a3018";
      ctx.font = "26px 'Special Elite', serif";
      ctx.fillText("#" + (i + 1), 56, y);
      let name = String(list[i].pseudo);
      if (name.length > 13) {
        name = name.slice(0, 12) + "…";
      }
      ctx.fillText(name, 192, y);
      ctx.textAlign = "right";
      ctx.fillText(list[i].prime + " $", 664, y);
      ctx.textAlign = "left";
      const my = seq;
      const img = new Image();
      const iy = y;
      img.onload = function () {
        if (my !== seq) {
          return;
        }
        ctx.drawImage(img, 132, iy - 28, 38, 38);
        tex.needsUpdate = true;
      };
      img.src = portraitDataUrl(list[i].skin, 64, list[i].accessories, list[i].weapon);
    }
    tex.needsUpdate = true;
  };
  tex.userData.draw("", null);
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 3.27),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
    );
  sheet.position.set(0, 2.05, 0.06);
  group.add(sheet);
  return { group: group, tex: tex };
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

function labelSprite(getText) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  function draw() {
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = "52px Rye, serif";
    let size = 52;
    while (ctx.measureText(getText()).width > 490 && size > 24) {
      size -= 3;
      ctx.font = size + "px Rye, serif";
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(20, 12, 6, 0.9)";
    ctx.strokeText(getText(), 256, 64);
    ctx.fillStyle = "#ffd98a";
    ctx.fillText(getText(), 256, 64);
    tex.needsUpdate = true;
  }
  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(3.4, 0.85, 1);
  sprite.userData.redraw = draw;
  return sprite;
}

function makeCrowTarget() {
  const group = new THREE.Group();
  const woodMat = mat(0x5c3a1d, 1);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.2, 8), woodMat);
  post.position.y = 1.1;
  post.castShadow = true;
  group.add(post);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 18), mat(0xe8e4e1, 1));
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 2.6;
  disc.castShadow = true;
  group.add(disc);
  const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 18), mat(0xa83c2a, 1));
  ring1.rotation.x = Math.PI / 2;
  ring1.position.set(0, 2.6, 0.04);
  group.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 18), mat(0xffffff, 1));
  ring2.rotation.x = Math.PI / 2;
  ring2.position.set(0, 2.6, 0.08);
  group.add(ring2);
  const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), mat(0x1a140c, 1));
  bullseye.rotation.x = Math.PI / 2;
  bullseye.position.set(0, 2.6, 0.12);
  group.add(bullseye);
  const dark = mat(0x1a140c, 1);
  const crowBody = box(0.2, 0.16, 0.34, dark);
  crowBody.position.set(0.1, 3.40, 0);
  group.add(crowBody);
  const crowHead = box(0.15, 0.12, 0.12, dark);
  crowHead.position.set(0.1, 3.53, 0.16);
  group.add(crowHead);
  const beak = box(0.05, 0.04, 0.1, mat(0xd8b13c, 1));
  beak.position.set(0.1, 3.51, 0.26);
  group.add(beak);
  return group;
}

function makeStagecoach() {
  const group = new THREE.Group();
  const woodMat = mat(0x6b3a1d, 1);
  const darkMat = mat(0x35230f, 1);
  const cabin = box(1.5, 1.3, 2.6, woodMat);
  cabin.position.y = 1.35;
  group.add(cabin);
  const roof = box(1.6, 0.12, 2.8, darkMat);
  roof.position.y = 2.06;
  group.add(roof);
  const rail = box(1.4, 0.18, 2.4, darkMat);
  rail.position.y = 2.2;
  group.add(rail);
  const winMat = mat(0x121a24, 0.4);
  for (const side of [-1, 1]) {
    const win = box(0.06, 0.5, 0.7, winMat);
    win.position.set(side * 0.76, 1.5, 0.3);
    group.add(win);
    const win2 = box(0.06, 0.5, 0.7, winMat);
    win2.position.set(side * 0.76, 1.5, -0.7);
    group.add(win2);
  }
  const bench = box(1.4, 0.3, 0.7, darkMat);
  bench.position.set(0, 1.9, 1.55);
  group.add(bench);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), darkMat);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, 0.55, 1.5);
  group.add(shaft);
  const hitch = box(0.5, 0.1, 0.5, darkMat);
  hitch.position.set(0, 0.6, 1.25);
  group.add(hitch);
  const wheelSpots = [[-0.85, 0.55, 1.05, 0.55], [0.85, 0.55, 1.05, 0.55], [-0.85, 0.72, -1.05, 0.72], [0.85, 0.72, -1.05, 0.72]];
  for (const spot of wheelSpots) {
    const wheel = makeWagonWheel();
    wheel.scale.setScalar(spot[3]);
    wheel.position.set(spot[0], spot[1], spot[2]);
    wheel.rotation.y = Math.PI / 2;
    group.add(wheel);
  }
  group.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });
  return group;
}

function makeCrate() {
  const crate = box(0.6, 0.6, 0.6, mat(0x8a6a3c, 1));
  crate.position.y = 0.3;
  return crate;
}

function makeBarrelProp() {
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.9, 10), mat(0x5c3d1e, 1));
  barrel.position.y = 0.45;
  barrel.castShadow = true;
  return barrel;
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

export function buildTown(scene, impactTargets) {
  const group = new THREE.Group();
  scene.add(group);

  const buildings = [
    { x: -9.5, z: 2, ry: Math.PI / 2, w: 7, h: 5.6, color: 0x74522f, sign: "SHERIFF", doorX: 0 },
    { x: -9.5, z: -6, ry: Math.PI / 2, w: 8.4, h: 6, color: 0x8a5a2e, sign: "GENERAL STORE", doorX: 0, noDoor: true, hollow: true },
    { x: -9.5, z: -16, ry: Math.PI / 2, w: 9, h: 8, color: 0x9c6b38, sign: "HOTEL", doorX: 0, windows: [-3, -1.5, 1.5, 3] },
    { x: -9.5, z: -26, ry: Math.PI / 2, w: 7, h: 6.2, color: 0x6b4a26, sign: "BANK", doorX: 0 },
    { x: 9.5, z: -2, ry: -Math.PI / 2, w: 9, h: 7, color: 0x84603a, sign: "SALOON", doorX: 0, saloon: true, windows: [-2.8, 2.8] },
    { x: 9.5, z: -12, ry: -Math.PI / 2, w: 7.6, h: 5.4, color: 0x74522f, sign: "GUNSMITH", doorX: 1 },
    { x: 9.5, z: -22, ry: -Math.PI / 2, w: 8, h: 6.4, color: 0x8a5a2e, sign: "TELEGRAPH", doorX: 0 },
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

  const leaderBoard = makeLeaderBoard();
  leaderBoard.group.position.set(-5.8, 0, 8.5);
  leaderBoard.group.rotation.y = 0.78;
  group.add(leaderBoard.group);

  function refreshBoard(title, rows, sub) {
    leaderBoard.tex.userData.draw(title, rows, sub);
  }

  const storeDoorPivot = new THREE.Group();
  storeDoorPivot.position.set(-6.44, 0, -6.53);
  group.add(storeDoorPivot);
  const storeDoorMesh = box(0.07, 2.12, 1.08, mat(0x241608, 1));
  storeDoorMesh.position.set(0, 1.04, 0.53);
  storeDoorPivot.add(storeDoorMesh);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), mat(0xc7a34a, 1));
  knob.position.set(0.05, 1.0, 0.93);
  storeDoorPivot.add(knob);
  let doorOpenTarget = 0;

  function setStoreDoor(open) {
    doorOpenTarget = open ? 1 : 0;
  }




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
  trough.position.set(5.7, 0, 6.4);
  trough.rotation.y = 0.2;
  group.add(trough);

  for (const spot of [[-5.9, -8.9], [-6.0, -8.2], [5.9, -14.5]]) {
    const crate = makeCrate();
    crate.position.set(spot[0], crate.position.y, spot[1]);
    crate.rotation.y = Math.random() * 1.5;
    group.add(crate);
    impactTargets.push(crate);
  }

  const stagecoach = makeStagecoach();
  stagecoach.position.set(5, 0, 15.2);
  stagecoach.rotation.y = Math.PI + 1.15;
  group.add(stagecoach);
  impactTargets.push(stagecoach);

  const interactables = [];
  stagecoach.traverse(function (child) {
    if (child.isMesh) {
      child.userData.action = "coach";
      child.userData.root = stagecoach;
      interactables.push(child);
    }
  });
  const coachLabel = labelSprite(function () {
    return group.userData.coachLabel || "";
  });
  coachLabel.position.set(5, 3.4, 15.2);
  group.add(coachLabel);

  const crowTarget = makeCrowTarget();
  crowTarget.position.set(-2.2, 0, 15.6);
  crowTarget.rotation.y = 2.03;
  group.add(crowTarget);
  crowTarget.traverse(function (child) {
    if (child.isMesh) {
      child.userData.action = "birds";
      child.userData.root = crowTarget;
      interactables.push(child);
    }
  });
  const birdsLabel = labelSprite(function () {
    return group.userData.birdsLabel || "";
  });
  birdsLabel.position.set(-2.2, 4.15, 15.6);
  group.add(birdsLabel);

  const oldJed = createCowboy();
  const jedSkin = aiSkinFor("training");
  oldJed.setSkin(jedSkin.colors);
  oldJed.setOutfit(jedSkin.outfit || null);
  oldJed.setAccessories(jedSkin.acc);
  oldJed.setHolsterHand(true);
  const jedX = 1.2;
  const jedZ = 14.2;
  oldJed.group.position.set(jedX, 0.15, jedZ);
  oldJed.group.rotation.y = Math.atan2(0.6 - jedX, 12.4 - jedZ) + 0.15;
  group.add(oldJed.group);
  for (const mesh of oldJed.hitMeshes) {
    mesh.userData.action = "oldjed";
    mesh.userData.root = oldJed.group;
    interactables.push(mesh);
  }
  const jedLabel = labelSprite(function () {
    return group.userData.jedLabel || "";
  });
  jedLabel.position.set(jedX, 2.7, jedZ);
  group.add(jedLabel);

  function setLabels(birds, coach, jed) {
    group.userData.birdsLabel = birds;
    group.userData.coachLabel = coach;
    group.userData.jedLabel = jed;
    birdsLabel.userData.redraw();
    coachLabel.userData.redraw();
    jedLabel.userData.redraw();
  }

  function setRangeProps(visible) {
    crowTarget.visible = visible;
    birdsLabel.visible = visible;
    stagecoach.visible = visible;
    coachLabel.visible = visible;
    oldJed.group.visible = visible;
    jedLabel.visible = visible;
  }

  const coverSpots = [[-4.5, 21], [1.5, 19.5], [6.2, 24], [-1.2, 26], [4.2, 28]];
  const rangeCovers = [];
  for (const spot of coverSpots) {
    const cover = Math.random() < 0.5 ? makeCrate() : makeBarrelProp();
    cover.position.x = spot[0];
    cover.position.z = spot[1];
    group.add(cover);
    impactTargets.push(cover);
    rangeCovers.push(new THREE.Vector3(spot[0], 0, spot[1]));
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
  const horseA = makeHorse(0xffffff, 0x8a5a2e);
  horseA.group.position.set(6.5, 0, 3.1);
  horseA.group.rotation.y = -Math.PI / 2;
  group.add(horseA.group);
  horses.push(horseA);

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
    { from: new THREE.Vector3(-5.2, 0.15, -4), to: new THREE.Vector3(-5.2, 0.15, -26), speed: 1.15 },
    { from: new THREE.Vector3(5.3, 0.15, -22), to: new THREE.Vector3(5.3, 0.15, 0), speed: 1.0 }
  ];
  for (let i = 0; i < walkerPaths.length; i++) {
    const npc = createCowboy();
    npc.setSkin(NPC_SKINS[i % NPC_SKINS.length]);
    npc.setWalk(true);
    npc.group.position.copy(walkerPaths[i].from);
    scene.add(npc.group);
    walkers.push({ cowboy: npc, path: walkerPaths[i], t: Math.random(), dir: 1 });
  }

  const interior = new THREE.Group();
  interior.position.set(-9.5, 0, -6);
  interior.rotation.y = Math.PI / 2;
  scene.add(interior);
  const floorIn = box(7.6, 0.16, 5.3, mat(0x6b4a26, 1));
  floorIn.position.y = 0.08;
  interior.add(floorIn);
  const doorSill = box(0.5, 0.16, 1.06, mat(0x6b4a26, 1));
  doorSill.position.set(-6.66, 0.08, -6);
  scene.add(doorSill);
  const ceiling = box(7.6, 0.14, 5.3, mat(0x4a3018, 1));
  ceiling.position.y = 3.2;
  interior.add(ceiling);
  const counter = box(4.2, 1.05, 0.7, mat(0x5c3a1d, 1));
  counter.position.set(0, 0.68, -1.35);
  interior.add(counter);
  const counterTop = box(4.5, 0.08, 0.9, mat(0x35230f, 1));
  counterTop.position.set(0, 1.24, -1.35);
  interior.add(counterTop);
  for (const shelfY of [1.35, 1.95, 2.55]) {
    const shelf = box(5, 0.07, 0.45, mat(0x5c3a1d, 1));
    shelf.position.set(0, shelfY, -2.38);
    interior.add(shelf);
    for (let i = 0; i < 7; i++) {
      const isBottle = (i + shelfY) % 2 < 1;
      const item = isBottle
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6), mat(0x2e5a4a, 0.4))
        : box(0.16, 0.2, 0.16, mat(0xa8743c, 1));
      item.position.set(-2.1 + i * 0.7, shelfY + (isBottle ? 0.19 : 0.14), -2.34);
      item.castShadow = true;
      interior.add(item);
    }
  }
  const interiorWheel = makeWagonWheel();
  interiorWheel.position.set(2.9, 0.74, -2.05);
  interiorWheel.rotation.set(0, 0.4, 0.25);
  interior.add(interiorWheel);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), mat(0x8a4632, 1));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.17, 0.7);
  interior.add(rug);
  for (const side of [-1, 1]) {
    const lamp = new THREE.PointLight(0xffc27a, 1.5, 12);
    lamp.position.set(side * 2.2, 2.7, -0.3);
    interior.add(lamp);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    bulb.position.set(side * 2.2, 2.7, -0.3);
    interior.add(bulb);
  }
  const vendor = createCowboy();
  vendor.setSkin({ skin: 0xc98f5e, shirt: 0xd8d0c0, pants: 0x4a3524, hat: 0x6b4a1f, bandana: 0x8a4632 });
  vendor.setAccessories(["mustache"]);
  vendor.group.position.set(0, 0.16, -1.95);
  vendor.group.rotation.y = 0;
  interior.add(vendor.group);

  let elapsed = 0;

  function update(dt) {
    elapsed += dt;

    for (const horse of horses) {
      horse.phase += dt;
      horse.neck.rotation.x = Math.sin(horse.phase * 0.7) * 0.09 + Math.max(0, Math.sin(horse.phase * 0.13)) * 0.35;
      horse.tail.rotation.z = Math.sin(horse.phase * 1.7) * 0.4;
      horse.tail.rotation.x = Math.sin(horse.phase * 1.1) * 0.15;
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
    vendor.update(dt);
    oldJed.update(dt);
    const doorGoal = doorOpenTarget * -1.52;
    storeDoorPivot.rotation.y += (doorGoal - storeDoorPivot.rotation.y) * Math.min(1, dt * 2);
  }

  const anchors = {
    home: {
      spot: new THREE.Vector3(0.4, 0, 2.8),
      face: -0.5,
      cam: new THREE.Vector3(-0.8, 1.75, 5.6),
      look: new THREE.Vector3(0.5, 1.05, 2.7)
    },
    profile: {
      spot: new THREE.Vector3(0.4, 0, 2.8),
      face: -0.5,
      cam: new THREE.Vector3(0.22, 1.5, 5.75),
      look: new THREE.Vector3(1.87, 0.98, 2.15)
    },
    road: {
      spot: new THREE.Vector3(0, 0, -7.5),
      face: Math.PI,
      cam: new THREE.Vector3(2.6, 2.1, -2.6),
      look: new THREE.Vector3(-0.4, 1.2, -9)
    },
    store: {
      cut: true,
      spot: new THREE.Vector3(0.4, 0, 2.8),
      face: -0.5,
      approach: {
        cam: new THREE.Vector3(-3.2, 1.7, -3.8),
        look: new THREE.Vector3(-6.8, 1.5, -6.2)
      },
      door: {
        set: setStoreDoor,
        outside: {
          cam: new THREE.Vector3(-5.95, 1.5, -6.0),
          look: new THREE.Vector3(-9.6, 1.1, -6.0)
        },
        inside: {
          cam: new THREE.Vector3(-7.35, 1.52, -6.0),
          look: new THREE.Vector3(-11.6, 1.0, -6.0)
        }
      },
      cam: new THREE.Vector3(-8.4, 1.55, -6.0),
      look: new THREE.Vector3(-12.3, 0.95, -6.0)
    },
    board: {
      spot: new THREE.Vector3(-4.9, 0, 9.4),
      face: -2.3,
      cam: new THREE.Vector3(-3.35, 2.1, 10.95),
      look: new THREE.Vector3(-5.8, 2.0, 8.5)
    },
    wardrobe: {
      spot: new THREE.Vector3(0.4, 0, 2.8),
      face: -0.5,
      cam: new THREE.Vector3(0.22, 1.5, 5.25),
      look: new THREE.Vector3(1.87, 0.98, 2.15)
    },
    saloon: {
      spot: new THREE.Vector3(5.4, 0, -2),
      face: Math.PI / 2,
      cam: new THREE.Vector3(1.8, 1.8, 0.4),
      look: new THREE.Vector3(7.4, 1.6, -2.4)
    },
    range: {
      spot: new THREE.Vector3(0.6, 0, 12.4),
      face: 0,
      cam: new THREE.Vector3(0.6, 2.1, 8.6),
      look: new THREE.Vector3(1.3, 1.6, 15)
    }
  };

  function setWalkersVisible(v) {
    for (const w of walkers) {
      w.cowboy.group.visible = v;
    }
    for (const horse of horses) {
      horse.group.visible = v;
    }
  }

  return {
    update: update,
    anchors: anchors,
    rangeCovers: rangeCovers,
    interactables: interactables,
    setLabels: setLabels,
    setRangeProps: setRangeProps,
    refreshBoard: refreshBoard,
    setWalkersVisible: setWalkersVisible
  };
}
