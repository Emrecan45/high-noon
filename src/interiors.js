import * as THREE from "three";
import { createCowboy, makeStarMesh } from "./cowboy.js";

function mat(color, roughness) {
  return new THREE.MeshStandardMaterial({ color: color, roughness: roughness || 0.9 });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function lamp(x, y, z, color, intensity, distance) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(x, y, z);
  return light;
}

const AMBIENT_SKINS = {
  barman: { skin: 0xd9a06b, shirt: 0xe8e0cf, pants: 0x3a2a18, hat: 0x6b4a26, bandana: 0x8a2f1d },
  pianist: { skin: 0xc98b5e, shirt: 0x4a3560, pants: 0x241608, hat: 0x241608, bandana: 0xd8b13c },
  patron1: { skin: 0xb5825a, shirt: 0x5c6e3a, pants: 0x3a2a18, hat: 0x4a3018, bandana: 0xc0392b },
  patron2: { skin: 0xd9a06b, shirt: 0x7a4c2a, pants: 0x2c2418, hat: 0x2c1c0c, bandana: 0x3b5998 },
  patron3: { skin: 0xc98b5e, shirt: 0x8a6a3c, pants: 0x1c1a18, hat: 0x5a4020, bandana: 0x2e6b4f },
  clerk: { skin: 0xe0b287, shirt: 0xcfc4a4, pants: 0x2c2418, hat: 0x1c1a18, bandana: 0x3a3a40 },
  deputy: { skin: 0xb5825a, shirt: 0x6b5030, pants: 0x2c2418, hat: 0x3a2a18, bandana: 0xd8b13c }
};

const SEAT_Y = -0.34;

function makeStool(woodMat) {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8), woodMat);
  seat.position.y = 0.48;
  seat.castShadow = true;
  group.add(seat);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.48, 6), woodMat);
    leg.position.set(Math.cos(a) * 0.14, 0.24, Math.sin(a) * 0.14);
    group.add(leg);
  }
  return group;
}

function makeTable(woodMat) {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.06, 12), woodMat);
  top.position.y = 0.78;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.76, 8), woodMat);
  leg.position.y = 0.38;
  group.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.05, 10), woodMat);
  foot.position.y = 0.03;
  group.add(foot);
  return group;
}

function makeGlass(color) {
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.09, 8),
    new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 })
  );
  glass.position.y = 0.855;
  return glass;
}

function makeBottle(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: color, roughness: 0.25 })
  );
  body.position.y = 0.1;
  group.add(body);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.02, 0.08, 6),
    new THREE.MeshStandardMaterial({ color: color, roughness: 0.25 })
  );
  neck.position.y = 0.24;
  group.add(neck);
  return group;
}

function makeCards(group, x, z) {
  const cardMat = new THREE.MeshStandardMaterial({ color: 0xe8e0cf, roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.13), cardMat);
    card.rotation.x = -Math.PI / 2;
    card.rotation.z = (i - 1) * 0.5 + 0.2;
    card.position.set(x + (i - 1) * 0.07, 0.815, z + (i % 2) * 0.04);
    group.add(card);
  }
}

function makeRifle(gunMat, stockMat) {
  const group = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), gunMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = -0.15;
  group.add(barrel);
  const stock = box(0.36, 0.09, 0.05, stockMat);
  stock.position.set(0.28, -0.02, 0);
  stock.rotation.z = 0.12;
  group.add(stock);
  return group;
}

function makeCross(woodMat, h) {
  const group = new THREE.Group();
  const post = box(0.09, h, 0.07, woodMat);
  post.position.y = h / 2;
  group.add(post);
  const beam = box(0.5, 0.09, 0.07, woodMat);
  beam.position.y = h * 0.72;
  group.add(beam);
  return group;
}

export function createInteriors(scene) {
  const sets = {};
  const ambients = [];
  const saloonDoorAnim = [];
  const wood = mat(0x5c3a1d, 1);
  const woodDark = mat(0x3a2412, 1);
  const woodLight = mat(0x8a6238, 0.95);
  const iron = mat(0x2c2c30, 0.6);

  function addAmbient(setGroup, skinId, x, y, z, faceY, seated, talk) {
    const body = createCowboy();
    body.setSkin(AMBIENT_SKINS[skinId]);
    body.setAccessories([]);
    body.group.position.set(x, y, z);
    body.group.rotation.y = faceY;
    if (seated) {
      body.setSeated(true);
    }
    if (talk) {
      body.setTalk(true);
    }
    setGroup.add(body.group);
    ambients.push({ body: body, set: setGroup, id: skinId });
    return body;
  }

  function setAmbientVisible(id, visible) {
    for (const amb of ambients) {
      if (amb.id === id) {
        amb.body.group.visible = visible;
      }
    }
  }

  function makeRoom(group, w, d, h, wallMat, floorMat, doorW, windows) {
    const floor = box(w + 0.4, 0.14, d + 0.4, floorMat);
    floor.position.y = -0.04;
    group.add(floor);
    const stripMat = mat(0x4a3018, 1);
    for (let x = -w / 2 + 0.9; x < w / 2; x += 0.9) {
      const strip = box(0.03, 0.005, d, stripMat);
      strip.position.set(x, 0.035, 0);
      group.add(strip);
    }
    const back = box(w + 0.4, h, 0.2, wallMat);
    back.position.set(0, h / 2, -d / 2 - 0.1);
    group.add(back);
    for (const sx of [-1, 1]) {
      const side = box(0.2, h, d + 0.4, wallMat);
      side.position.set(sx * (w / 2 + 0.1), h / 2, 0);
      group.add(side);
    }
    const frontW = (w - doorW) / 2;
    for (const sx of [-1, 1]) {
      const frontCenter = sx * (doorW / 2 + frontW / 2);
      let hasWin = false;
      if (windows !== undefined) {
        for (const wx of windows) {
          if (Math.sign(wx) === sx) {
            const winW = 1.2;
            const winH = 1.4;
            const winY = 1.0;
            const leftX = sx === -1 ? -w / 2 : doorW / 2;
            const rightX = sx === -1 ? -doorW / 2 : w / 2;
            const wxLeft = wx - winW / 2;
            const wxRight = wx + winW / 2;
            
            const w1 = Math.abs(wxLeft - leftX);
            if (w1 > 0.01) {
              const s1 = box(w1, h, 0.2, wallMat);
              s1.position.set(leftX + w1 / 2, h / 2, d / 2 + 0.1);
              group.add(s1);
            }
            const w2 = Math.abs(rightX - wxRight);
            if (w2 > 0.01) {
              const s2 = box(w2, h, 0.2, wallMat);
              s2.position.set(wxRight + w2 / 2, h / 2, d / 2 + 0.1);
              group.add(s2);
            }
            const b1 = box(winW, winY, 0.2, wallMat);
            b1.position.set(wx, winY / 2, d / 2 + 0.1);
            group.add(b1);
            const tH = h - (winY + winH);
            if (tH > 0.01) {
              const t1 = box(winW, tH, 0.2, wallMat);
              t1.position.set(wx, h - tH / 2, d / 2 + 0.1);
              group.add(t1);
            }
            hasWin = true;
            break;
          }
        }
      }
      if (!hasWin) {
        const front = box(frontW, h, 0.2, wallMat);
        front.position.set(frontCenter, h / 2, d / 2 + 0.1);
        group.add(front);
      }
    }
    const lintel = box(doorW, h - 2.2, 0.2, wallMat);
    lintel.position.set(0, 2.2 + (h - 2.2) / 2, d / 2 + 0.1);
    group.add(lintel);
    const ceiling = box(w + 0.4, 0.12, d + 0.4, woodDark);
    ceiling.position.set(0, h + 0.06, 0);
    ceiling.receiveShadow = false;
    ceiling.castShadow = false;
    group.add(ceiling);
  }

  function buildSaloon() {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(0, 0, -100);
    group.position.copy(origin);
    makeRoom(group, 10, 8, 3.4, mat(0x7a5a36, 1), mat(0x75512c, 1), 1.4, [-2.8, 2.8]);

    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.62, 1.05, 4.14);
      const door = box(0.55, 1.15, 0.05, woodLight);
      door.position.set(sx * -0.275, 0, 0);
      pivot.add(door);
      pivot.rotation.y = sx * 0.18;
      group.add(pivot);
      saloonDoorAnim.push({ pivot: pivot, side: sx, rest: sx * 0.18, t: -1 });
    }

    const barBody = box(0.75, 1.02, 4.5, woodDark);
    barBody.position.set(-3.3, 0.51, -0.7);
    group.add(barBody);
    const barTop = box(0.95, 0.08, 4.7, woodLight);
    barTop.position.set(-3.3, 1.06, -0.7);
    group.add(barTop);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 6), mat(0xd8b13c, 0.4));
    rail.rotation.x = Math.PI / 2;
    rail.position.set(-2.8, 0.22, -0.7);
    group.add(rail);

    const mirror = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x50585e, roughness: 0.4, metalness: 0.05 })
    );
    mirror.position.set(-4.88, 1.9, -0.7);
    mirror.rotation.y = Math.PI / 2;
    group.add(mirror);
    for (const sy of [1.42, 2.52]) {
      const shelf = box(0.3, 0.05, 3, woodLight);
      shelf.position.set(-4.75, sy, -0.7);
      group.add(shelf);
    }
    const bottleColors = [0x3e6b4c, 0xc0392b, 0xd8b13c, 0x3b5998, 0x8a4a1e, 0x2e6b4f, 0xb0722a, 0x6b3a5c];
    for (let i = 0; i < 8; i++) {
      const bottle = makeBottle(bottleColors[i]);
      bottle.position.set(-4.75, i < 4 ? 1.445 : 2.545, -2 + (i % 4) * 0.85);
      group.add(bottle);
    }

    const piano = new THREE.Group();
    const pianoBody = box(1.4, 1.15, 0.55, woodDark);
    pianoBody.position.set(0, 0.575, 0);
    piano.add(pianoBody);
    const keys = box(1.25, 0.06, 0.28, mat(0xe8e0cf, 0.6));
    keys.position.set(0, 0.85, 0.38);
    piano.add(keys);
    const keysDark = box(1.25, 0.062, 0.1, mat(0x14100a, 0.6));
    keysDark.position.set(0, 0.852, 0.31);
    piano.add(keysDark);
    piano.position.set(3.6, 0, -3.65);
    group.add(piano);
    const pianoStool = makeStool(wood);
    pianoStool.position.set(3.6, 0, -2.85);
    group.add(pianoStool);

    const table1 = makeTable(wood);
    table1.position.set(0.6, 0, -1.7);
    group.add(table1);
    makeCards(group, 0.6, -1.7);
    const glass1 = makeGlass(0xd8b13c);
    glass1.position.set(0.9, 0.855, -1.5);
    group.add(glass1);
    const table2 = makeTable(wood);
    table2.position.set(2.1, 0, 1.6);
    group.add(table2);
    const glass2 = makeGlass(0xc0392b);
    glass2.position.set(1.9, 0.855, 1.75);
    group.add(glass2);
    const glass3 = makeGlass(0xd8b13c);
    glass3.position.set(2.35, 0.855, 1.4);
    group.add(glass3);

    const stoolSpots = [
      [-0.35, -1.7, Math.PI / 2],
      [1.55, -1.7, -Math.PI / 2],
      [-2.65, 0.4, -Math.PI / 2],
      [1.15, 1.6, Math.PI / 2],
      [3.05, 1.6, -Math.PI / 2]
    ];
    for (const spot of stoolSpots) {
      const stool = makeStool(wood);
      stool.position.set(spot[0], 0, spot[1]);
      group.add(stool);
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 14), woodDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 2.62, -0.3);
    group.add(ring);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0xf3e4c2, emissive: 0xffc86b, emissiveIntensity: 0.9 })
      );
      candle.position.set(Math.cos(a) * 0.5, 2.72, -0.3 + Math.sin(a) * 0.5);
      group.add(candle);
    }
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.72, 4), iron);
    chain.position.set(0, 3.05, -0.3);
    group.add(chain);

    group.add(lamp(0, 2.45, -0.3, 0xffb066, 3.2, 22));
    group.add(lamp(-3.3, 2.3, -0.7, 0xffc98a, 2.0, 12));
    group.add(lamp(3.4, 2.1, -3, 0xff9e5e, 1.5, 10));
    group.add(lamp(0.5, 2.3, 1.8, 0xffdcae, 1.6, 20));

    addAmbient(group, "barman", -4.15, 0, -0.7, Math.PI / 2, false, false);
    const pianist = addAmbient(group, "pianist", 3.6, SEAT_Y, -2.85, Math.PI, true, true);
    pianist.group.rotation.y = Math.PI;
    addAmbient(group, "patron1", -0.35, SEAT_Y, -1.7, Math.PI / 2, true, false);
    addAmbient(group, "patron2", 1.55, SEAT_Y, -1.7, -Math.PI / 2, true, true);

    group.visible = false;
    scene.add(group);
    sets.saloon = {
      group: group,
      origin: origin,
      spots: {
        door: [0, 0, 3.6],
        entry: [0, 0, 2.4],
        center: [0.2, 0, 0.4],
        bar: [-2.5, 0, -0.7],
        table: [2.1, 0, 1.6],
        seatWest: [1.15, 0, 1.6],
        seatEast: [3.05, 0, 1.6],
        piano: [3.6, 0, -2.85]
      }
    };
  }

  function buildSheriff() {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(40, 0, -100);
    group.position.copy(origin);
    makeRoom(group, 8, 6, 3.2, mat(0x7a5c38, 1), mat(0x5f3f22, 1), 1.1, [-2.1, 2.1]);

    const deskTop = box(1.6, 0.08, 0.85, woodLight);
    deskTop.position.set(-0.4, 0.78, -0.7);
    group.add(deskTop);
    for (const dx of [-1, 1]) {
      const side = box(0.08, 0.74, 0.8, woodDark);
      side.position.set(-0.4 + dx * 0.72, 0.37, -0.7);
      group.add(side);
    }
    const drawer = box(1.42, 0.5, 0.06, woodDark);
    drawer.position.set(-0.4, 0.5, -0.35);
    group.add(drawer);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), mat(0xe8e0cf, 0.85));
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = 0.3;
    paper.position.set(-0.7, 0.825, -0.6);
    group.add(paper);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.14, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x3e6b4c, emissive: 0x7dc98f, emissiveIntensity: 0.5 })
    );
    shade.position.set(0.1, 0.95, -0.85);
    group.add(shade);
    const lampFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.14, 6), mat(0xd8b13c, 0.4));
    lampFoot.position.set(0.1, 0.86, -0.85);
    group.add(lampFoot);
    group.add(lamp(0.1, 1.1, -0.85, 0xa8ffc2, 0.9, 5));

    const chair = makeStool(wood);
    chair.position.set(-0.4, 0, -1.6);
    group.add(chair);
    const chairBack = box(0.44, 0.5, 0.05, wood);
    chairBack.position.set(-0.4, 0.75, -1.82);
    group.add(chairBack);
    const visitor = makeStool(wood);
    visitor.position.set(-0.4, 0, 0.6);
    group.add(visitor);

    for (let i = 0; i < 9; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 3.0, 6), iron);
      bar.position.set(1.7, 1.5, -2.9 + i * 0.28);
      group.add(bar);
    }
    for (let i = 0; i < 8; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 3.0, 6), iron);
      bar.position.set(1.7 + (i + 1) * 0.28, 1.5, -0.38);
      group.add(bar);
    }
    for (const rail of [[1.7, 0.06, -1.63, 0.06, 2.62, true], [1.7, 2.94, -1.63, 0.06, 2.62, true]]) {
      const r = box(0.07, rail[3], rail[5] ? 2.62 : 0.07, iron);
      r.position.set(rail[0], rail[1], rail[2]);
      group.add(r);
    }
    const cellBench = box(1.4, 0.1, 0.5, woodDark);
    cellBench.position.set(3.2, 0.42, -2.5);
    group.add(cellBench);
    for (const bx of [2.6, 3.8]) {
      const leg = box(0.08, 0.4, 0.4, woodDark);
      leg.position.set(bx, 0.21, -2.5);
      group.add(leg);
    }

    const rackFrame = box(1.3, 1, 0.08, woodDark);
    rackFrame.position.set(-2.6, 2, -2.85);
    group.add(rackFrame);
    for (let i = 0; i < 2; i++) {
      const rifle = makeRifle(iron, woodLight);
      rifle.position.set(-2.6, 1.75 + i * 0.42, -2.78);
      rifle.rotation.z = -0.1;
      group.add(rifle);
    }

    const star = makeStarMesh(0.22, 0.04, mat(0xe8b64c, 0.4));
    star.position.set(0.9, 2.3, -2.86);
    group.add(star);

    const safe = box(0.75, 0.85, 0.7, mat(0x3a3a40, 0.5));
    safe.position.set(-3.4, 0.425, -2.4);
    group.add(safe);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), mat(0xd8b13c, 0.4));
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-3.4, 0.5, -2.02);
    group.add(dial);

    const posterMat = mat(0xe4d3a8, 0.9);
    for (let i = 0; i < 2; i++) {
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.65), posterMat);
      poster.position.set(-1.6 + i * 0.7, 2.15, -2.88);
      poster.rotation.z = (i === 0 ? 1 : -1) * 0.04;
      group.add(poster);
      const ink = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), mat(0x8a6a3c, 0.9));
      ink.position.set(-1.6 + i * 0.7, 2.15, -2.875);
      ink.rotation.z = (i === 0 ? 1 : -1) * 0.04;
      group.add(ink);
    }

    group.add(lamp(0, 2.4, 0.2, 0xffc98a, 2.8, 16));
    group.add(lamp(-2, 2.2, 1, 0xffd9a8, 1.2, 14));

    group.visible = false;
    scene.add(group);
    sets.sheriff = {
      group: group,
      origin: origin,
      spots: {
        door: [0, 0, 2.7],
        entry: [0, 0, 1.6],
        desk: [-0.4, 0, 0.4],
        chair: [-0.4, 0, -1.6],
        cell: [3, 0, -1.6],
        center: [0.4, 0, 0.6]
      }
    };
  }

  function buildBank() {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(80, 0, -100);
    group.position.copy(origin);
    makeRoom(group, 10, 7, 3.4, mat(0x9a8468, 1), mat(0x7a6a52, 1), 1.3, [-2.8, 2.8]);

    const counter = box(7, 1.05, 0.55, woodDark);
    counter.position.set(0, 0.525, -0.5);
    group.add(counter);
    const counterTop = box(7.2, 0.07, 0.75, woodLight);
    counterTop.position.set(0, 1.09, -0.5);
    group.add(counterTop);
    for (let i = 0; i < 30; i++) {
      const x = -3.4 + i * 0.235;
      if (Math.abs(x) < 2.9) {
        continue;
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 5), mat(0xd8b13c, 0.45));
      bar.position.set(x, 1.75, -0.5);
      group.add(bar);
    }
    for (const bx of [-3.15, 3.15]) {
      const barsTop = box(0.6, 0.08, 0.1, woodDark);
      barsTop.position.set(bx, 2.4, -0.5);
      group.add(barsTop);
    }

    const vault = box(2.1, 2.5, 0.8, mat(0x4a4a52, 0.45));
    vault.position.set(0, 1.25, -3.05);
    group.add(vault);
    const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 18), mat(0x62626e, 0.35));
    vaultDoor.rotation.x = Math.PI / 2;
    vaultDoor.position.set(0, 1.2, -2.6);
    group.add(vaultDoor);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const spoke = box(0.4, 0.05, 0.05, mat(0xd8b13c, 0.35));
      spoke.position.set(Math.cos(a) * 0.14, 1.2 + Math.sin(a) * 0.14, -2.52);
      spoke.rotation.z = a;
      group.add(spoke);
    }
    const bagMat = mat(0xc9b183, 0.95);
    for (const spot of [[-1.5, -2.4], [-1.15, -2.15], [1.35, -2.35], [1.7, -2.05]]) {
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), bagMat);
      bag.scale.y = 0.78;
      bag.position.set(spot[0], 0.19, spot[1]);
      bag.castShadow = true;
      group.add(bag);
    }

    const writeTable = box(1.3, 0.07, 0.7, woodLight);
    writeTable.position.set(-3.1, 0.85, 1.6);
    group.add(writeTable);
    for (const dx of [-0.55, 0.55]) {
      const leg = box(0.07, 0.82, 0.07, woodDark);
      leg.position.set(-3.1 + dx, 0.41, 1.6);
      group.add(leg);
    }
    const ledger = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), mat(0xe8e0cf, 0.85));
    ledger.rotation.x = -Math.PI / 2;
    ledger.position.set(-3.1, 0.89, 1.6);
    group.add(ledger);

    for (const spot of [[2.9, 1.7], [3.5, 2.3]]) {
      const crate = box(0.7, 0.7, 0.7, wood);
      crate.position.set(spot[0], 0.35, spot[1]);
      group.add(crate);
    }
    const cart = box(1.1, 0.5, 0.7, woodDark);
    cart.position.set(-1.9, 0.3, 2.5);
    group.add(cart);

    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 14), mat(0xe8e0cf, 0.7));
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 2.85, -3.32);
    group.add(clockFace);

    group.add(lamp(-2, 2.5, 0.8, 0xffd9a0, 2.4, 15));
    group.add(lamp(2, 2.5, 0.8, 0xffd9a0, 2.4, 15));
    group.add(lamp(0, 2.6, 2.4, 0xffe2b8, 1.4, 16));
    group.add(lamp(0, 2.2, -2.2, 0xffc98a, 1.6, 10));

    group.visible = false;
    scene.add(group);
    sets.bank = {
      group: group,
      origin: origin,
      spots: {
        door: [0, 0, 3.2],
        entry: [0, 0, 2.2],
        hall: [0, 0, 1.2],
        counter: [0, 0, 0.35],
        window: [-1.6, 0, 0.35],
        vault: [0, 0, -2],
        center: [0.3, 0, 1.4]
      },
      covers: [
        [-1.6, -1.1],
        [1.6, -1.1],
        [2.9, 1.7],
        [-1.9, 2.5],
        [0, -2]
      ],
      hostages: [
        [-3.1, 2.3, 0.6],
        [1, 2.8, -0.5]
      ]
    };
  }

  function buildGraveyard() {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(120, 0, -100);
    group.position.copy(origin);

    const dirt = box(15, 0.12, 13, mat(0x4a3b2a, 1));
    dirt.position.y = -0.03;
    group.add(dirt);

    const fenceMat = mat(0x3a2a18, 1);
    function fencePost(x, z) {
      const post = box(0.09, 0.95, 0.09, fenceMat);
      post.position.set(x, 0.47, z);
      group.add(post);
    }
    for (let x = -7; x <= 7; x += 1.4) {
      fencePost(x, -6.2);
      if (Math.abs(x) > 1.2) {
        fencePost(x, 6.2);
      }
    }
    for (let z = -6.2; z <= 6.2; z += 1.4) {
      fencePost(-7, z);
      fencePost(7, z);
    }
    for (const side of ["n", "s", "e", "w"]) {
      const horizontal = side === "n" || side === "s";
      const railGeo = horizontal ? [14, 0.06, 0.06] : [0.06, 0.06, 12.4];
      for (const ry of [0.35, 0.75]) {
        if (side === "s") {
          for (const sx of [-1, 1]) {
            const rail = box(5.6, 0.06, 0.06, fenceMat);
            rail.position.set(sx * 4.2, ry, 6.2);
            group.add(rail);
          }
          continue;
        }
        const rail = box(railGeo[0], railGeo[1], railGeo[2], fenceMat);
        if (side === "n") {
          rail.position.set(0, ry, -6.2);
        } else {
          rail.position.set(side === "e" ? 7 : -7, ry, 0);
        }
        group.add(rail);
      }
    }
    for (const gx of [-1.4, 1.4]) {
      const gatePost = box(0.14, 2.5, 0.14, fenceMat);
      gatePost.position.set(gx, 1.25, 6.2);
      group.add(gatePost);
    }
    const arch = box(3.2, 0.28, 0.12, fenceMat);
    arch.position.set(0, 2.55, 6.2);
    group.add(arch);

    const graveSpots = [
      [-4.4, -3.5, 0.06], [-2.4, -4.2, -0.04], [-0.2, -3.6, 0.03], [2.2, -4.4, -0.06],
      [4.6, -3.2, 0.05], [-3.6, -0.8, -0.03], [3.8, -0.6, 0.04], [-5, 2, 0.05]
    ];
    for (let i = 0; i < graveSpots.length; i++) {
      const spot = graveSpots[i];
      if (i % 2 === 0) {
        const cross = makeCross(woodDark, 0.9 + (i % 3) * 0.15);
        cross.position.set(spot[0], 0, spot[1]);
        cross.rotation.z = spot[2] * 3;
        cross.rotation.y = spot[2] * 5;
        group.add(cross);
      } else {
        const stone = box(0.52, 0.62, 0.14, mat(0x8a8578, 1));
        stone.position.set(spot[0], 0.31, spot[1]);
        stone.rotation.z = spot[2] * 2;
        group.add(stone);
      }
      const mound = box(0.6, 0.1, 1.1, mat(0x54432e, 1));
      mound.position.set(spot[0], 0.08, spot[1] + 0.8);
      group.add(mound);
    }

    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2), new THREE.MeshBasicMaterial({ color: 0x0a0805 }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(1.4, 0.036, 0.8);
    group.add(hole);
    const digMound = box(0.8, 0.34, 1.6, mat(0x54432e, 1));
    digMound.position.set(2.8, 0.17, 0.8);
    group.add(digMound);
    const coffin = box(0.55, 1.85, 0.32, woodDark);
    coffin.position.set(3.9, 0.9, 1.4);
    coffin.rotation.z = 0.18;
    coffin.rotation.x = -0.12;
    group.add(coffin);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.7, 7), mat(0x2c2018, 1));
    trunk.position.set(-4.6, 1.35, -4.6);
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    group.add(trunk);
    const branches = [
      [0.5, 2.6, 0.7, 1.1],
      [-0.4, 2.9, -0.5, 0.9],
      [0.15, 3.3, 0.2, 0.7]
    ];
    for (const b of branches) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, b[3], 5), mat(0x2c2018, 1));
      branch.position.set(-4.6 + b[0], b[1], -4.6 + b[2]);
      branch.rotation.z = b[0] * 1.4;
      branch.rotation.x = b[2] * 1.2;
      group.add(branch);
    }

    const lampPost = box(0.09, 1.9, 0.09, fenceMat);
    lampPost.position.set(-1.9, 0.95, 5.4);
    group.add(lampPost);
    const lampBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.3, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x2c1c0c, emissive: 0xffb85e, emissiveIntensity: 1 })
    );
    lampBox.position.set(-1.9, 1.95, 5.4);
    group.add(lampBox);
    group.add(lamp(-1.9, 1.9, 5.4, 0xffb066, 2.2, 14));

    group.visible = false;
    scene.add(group);
    sets.graveyard = {
      group: group,
      origin: origin,
      spots: {
        gate: [0, 0, 5.6],
        path: [0, 0, 3],
        grave: [1.4, 0, 2.2],
        holeSide: [0.4, 0, 0.8],
        tree: [-3.4, 0, -3.4],
        center: [0, 0, 0.6]
      }
    };
  }

  buildSaloon();
  buildSheriff();
  buildBank();
  buildGraveyard();

  function show(name) {
    for (const key of Object.keys(sets)) {
      sets[key].group.visible = key === name;
    }
  }

  function hideAll() {
    for (const key of Object.keys(sets)) {
      sets[key].group.visible = false;
    }
  }

  function spot(setName, spotName) {
    const set = sets[setName];
    const local = set.spots[spotName];
    return new THREE.Vector3(local[0] + set.origin.x, local[1], local[2] + set.origin.z);
  }

  let saloonDoorsOpen = false;
  function setSaloonDoors(open) {
    saloonDoorsOpen = open;
    if (!open) {
      for (const d of saloonDoorAnim) {
        d.t = 0;
      }
    }
  }

  function update(dt) {
    for (const entry of ambients) {
      if (entry.set.visible) {
        entry.body.update(dt);
      }
    }
    if (sets.saloon !== undefined && sets.saloon.group.visible) {
      for (const d of saloonDoorAnim) {
        if (saloonDoorsOpen) {
          const target = d.rest - d.side * 1.6;
          d.pivot.rotation.y += (target - d.pivot.rotation.y) * Math.min(1, dt * 7);
        } else if (d.t >= 0) {
          d.t += dt;
          const decay = Math.max(0, 1 - d.t / 1.5);
          d.pivot.rotation.y = d.rest - d.side * Math.sin(d.t * 8.5) * 1.2 * decay;
          if (d.t >= 1.5) {
            d.pivot.rotation.y = d.rest;
            d.t = -1;
          }
        }
      }
    }
  }

  return {
    sets: sets,
    show: show,
    hideAll: hideAll,
    spot: spot,
    setSaloonDoors: setSaloonDoors,
    setAmbientVisible: setAmbientVisible,
    update: update
  };
}
