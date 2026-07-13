import * as THREE from "three";
import { createRng } from "./rng.js";
import { createCowboy } from "./cowboy.js";
import { t } from "./i18n.js";

const BIRD_DURATION = 45;
const RELOAD_TIME = 1.3;
const LIVES = 2;
const WAVES = [3, 4, 5];
const COVERS = [
  [-4.5, 21],
  [1.5, 19.5],
  [6.2, 24],
  [-1.2, 26],
  [4.2, 28]
];
const BANK_COVERS = [
  [76.9, -98.4],
  [82.9, -98.3],
  [78.1, -97.5],
  [79.2, -96.9],
  [80.8, -96.9]
];
const TOWN_COVERS = [[-6.2, -2.5], [-6.2, -11.5], [5.8, -7.5], [6.2, 1.4], [-5.5, 2.5]];
const BANK_HOSTAGES = [
  [75.7, -99.1, 1.25],
  [84.3, -98.7, -1.25]
];
const BANK_CLERK = { at: [77.1, -101.6], ry: 0.35, skin: { skin: 0xe0b287, shirt: 0x8a4a5c, pants: 0x2c2418, hat: 0x5a4020, bandana: 0xd8b13c } };
const BANDIT_SKIN = { skin: 0xb5825a, shirt: 0x23211f, pants: 0x1c1a18, hat: 0x141210, bandana: 0xb3271e };
const HOSTAGE_SKINS = [
  { skin: 0xd9a06b, shirt: 0x8a6a3c, pants: 0x3a2a18, hat: 0x5a4020, bandana: 0x2e6b4f },
  { skin: 0xc98b5e, shirt: 0x5c6e3a, pants: 0x2c2418, hat: 0x4a3018, bandana: 0x3b5998 }
];

function makeBird() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a140c, roughness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.44), dark);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.24), dark);
  wingL.position.x = -0.36;
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.24), dark);
  wingR.position.x = 0.36;
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0xd8b13c, roughness: 1 }));
  beak.position.z = 0.26;
  group.add(body);
  group.add(wingL);
  group.add(wingR);
  group.add(beak);
  return { group: group, body: body, wingL: wingL, wingR: wingR };
}

export class Gallery {
  constructor(deps) {
    this.arena = deps.arena;
    this.ui = deps.ui;
    this.audio = deps.audio;
    this.viewmodel = deps.viewmodel;
    this.isTouch = deps.isTouch;
    this.mode = deps.mode;
    this.net = deps.net || null;
    this.onExit = deps.onExit;
    this.onReward = deps.onReward || null;
    this.quickEnd = deps.quickEnd || null;
    this.seed = deps.seed;
    this.disposed = false;
    this.finished = false;
    this.locked = false;
    this.listeners = [];
    this.baseYaw = deps.mode === "town" ? 0 : Math.PI;
    this.aimYaw = this.baseYaw;
    this.aimPitch = 0.08;
    this.busyUntil = 0;
    this.time = 0;
    this.score = 0;
    this.oppScore = 0;
    this.oppDone = null;
    this.birds = [];
    this.nextSpawn = 1;
    this.oppDoneSent = false;
    this.doneAt = null;
    this.toSpawn = 0;
    this.spawnGap = 0;
    this.rng = createRng(this.seed);
    this.bandits = [];
    this.hostages = [];
    this.wave = 0;
    this.coachHp = LIVES;
    this.pendingWave = 1.5;
    this.shake = 0;
  }

  addListener(target, type, handler) {
    target.addEventListener(type, handler);
    this.listeners.push([target, type, handler]);
  }

  start() {
    const self = this;
    const rig = this.arena.playerRig;
    if (this.mode === "bank") {
      rig.position.set(78.4, 1.6, -101.6);
      this.arena.interiors.show("bank");
    } else if (this.mode === "town") {
      rig.position.set(0.6, 1.6, 8);
    } else {
      rig.position.set(0.6, 1.6, 12.4);
    }
    this.arena.camera.position.set(0, 0, 0);
    this.arena.applyModifier({ id: "noon", sway: 0 }, 19);
    this.ui.hudVisible(true);
    this.ui.setScore(0, 0);
    this.ui.setHearts(this.mode === "birds" ? 0 : this.coachHp);
    this.ui.setDodges(0);
    this.ui.setGunState("");
    let tag = t("mgCoachName");
    if (this.mode === "birds") {
      tag = t("mgBirdsName");
    } else if (this.mode === "bank") {
      tag = t("mgBankName");
    } else if (this.mode === "town") {
      tag = t("mgTownName");
    }
    this.ui.setOppTag(tag.toUpperCase());
    this.ui.crosshair(true);
    this.ui.moveCrosshair(0, 0);
    this.ui.touchControls(this.isTouch);
    this.viewmodel.draw();

    const canvas = this.arena.renderer.domElement;
    this.addListener(document, "mousemove", function (e) {
      if (self.locked) {
        self.applyAim(e.movementX, e.movementY, 0.0022);
      }
    });
    this.addListener(document, "mousedown", function (e) {
      if (self.locked && e.button === 0) {
        self.onFire();
      }
    });
    this.addListener(document, "pointerlockchange", function () {
      self.locked = document.pointerLockElement === canvas;
      if (!self.isTouch && !self.locked && !self.disposed && !self.finished) {
        self.ui.showScreen("lock-prompt");
      } else if (self.locked) {
        self.ui.showScreen(null);
      }
    });
    this.addListener(document.getElementById("lock-prompt"), "click", function () {
      canvas.requestPointerLock();
    });
    if (this.isTouch) {
      let lastX = 0;
      let lastY = 0;
      let tracking = false;
      this.addListener(canvas, "touchstart", function (e) {
        tracking = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      });
      this.addListener(canvas, "touchmove", function (e) {
        if (tracking) {
          self.applyAim(e.touches[0].clientX - lastX, e.touches[0].clientY - lastY, 0.005);
          lastX = e.touches[0].clientX;
          lastY = e.touches[0].clientY;
        }
        e.preventDefault();
      });
      this.addListener(document.getElementById("btn-fire"), "touchstart", function (e) {
        e.preventDefault();
        self.onFire();
      });
    } else {
      this.tryLock(canvas);
    }

    if (this.net !== null) {
      this.net.onEvent(function (kind, data) {
        if (kind === "bscore") {
          self.oppScore = data.s;
          self.ui.setScore(self.score, self.oppScore);
        } else if (kind === "bdone") {
          self.oppDone = data.s;
          self.maybeFinishBirds();
        }
      });
      this.net.onLeft(function () {
        if (!self.finished) {
          self.finish(t("victory"), t("fledDetail"));
        }
      });
    }

    if (this.mode === "coach" || this.mode === "bank" || this.mode === "town") {
      this.setupBandits();
    }
    if (this.mode === "bank") {
      this.setupHostages();
    }
  }

  tryLock(canvas) {
    const self = this;
    try {
      canvas.requestPointerLock();
    } catch (err) {}
    setTimeout(function () {
      if (!self.locked && !self.disposed && !self.finished) {
        self.ui.showScreen("lock-prompt");
      }
    }, 450);
  }

  coverPool() {
    if (this.mode === "bank") {
      return BANK_COVERS;
    }
    if (this.mode === "town") {
      return TOWN_COVERS;
    }
    return COVERS;
  }

  winDetail() {
    if (this.mode === "bank") {
      return t("mgBankWin");
    }
    if (this.mode === "town") {
      return t("mgTownWin");
    }
    return t("mgCoachWin");
  }

  loseDetail() {
    if (this.mode === "bank") {
      return t("mgBankLose");
    }
    if (this.mode === "town") {
      return t("mgTownLose");
    }
    return t("mgCoachLose");
  }

  setupBandits() {
    for (let i = 0; i < 3; i++) {
      const bandit = createCowboy();
      bandit.setSkin(BANDIT_SKIN);
      bandit.setAccessories(["eyepatch"]);
      bandit.group.visible = false;
      this.arena.scene.add(bandit.group);
      this.bandits.push({ cowboy: bandit, state: "hidden", timer: 0, cover: 0, hideY: -1.55 });
    }
  }

  setupHostages() {
    for (let i = 0; i < BANK_HOSTAGES.length; i++) {
      const spot = BANK_HOSTAGES[i];
      const hostage = createCowboy();
      hostage.setSkin(HOSTAGE_SKINS[i]);
      hostage.setAccessories([]);
      hostage.setSeated(true);
      hostage.group.position.set(spot[0], -0.55, spot[1]);
      hostage.group.rotation.y = spot[2];
      this.arena.scene.add(hostage.group);
      this.hostages.push(hostage);
    }
    const clerk = createCowboy();
    clerk.setSkin(BANK_CLERK.skin);
    clerk.setAccessories([]);
    clerk.setSeated(true);
    clerk.group.position.set(BANK_CLERK.at[0], -0.55, BANK_CLERK.at[1]);
    clerk.group.rotation.y = BANK_CLERK.ry;
    this.arena.scene.add(clerk.group);
    this.hostages.push(clerk);
  }

  applyAim(dx, dy, sens) {
    this.aimYaw -= dx * sens;
    this.aimPitch -= dy * sens;
    this.aimYaw = Math.max(this.baseYaw - 1, Math.min(this.baseYaw + 1, this.aimYaw));
    this.aimPitch = Math.max(-0.3, Math.min(0.7, this.aimPitch));
  }

  onFire() {
    if (this.finished || this.disposed) {
      return;
    }
    if (this.time * 1000 < this.busyUntil) {
      return;
    }
    this.viewmodel.shoot();
    this.audio.gunshot();
    this.shake = 0.8;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.arena.camera);
    if (this.mode === "birds") {
      this.fireBirds(raycaster);
    } else {
      this.fireCoach(raycaster);
    }
    this.startReload();
  }

  startReload() {
    this.busyUntil = this.time * 1000 + RELOAD_TIME * 1000;
    this.viewmodel.reload(RELOAD_TIME);
    this.audio.playReload();
    this.ui.setGunState(t("reloading"));
  }

  fireBirds(raycaster) {
    for (const bird of this.birds) {
      if (bird.dead) {
        continue;
      }
      const center = new THREE.Vector3();
      bird.rig.group.getWorldPosition(center);
      const sphere = new THREE.Sphere(center, 0.62);
      if (raycaster.ray.intersectSphere(sphere, new THREE.Vector3()) !== null) {
        bird.dead = true;
        bird.fall = 0;
        this.score += 1;
        this.ui.setScore(this.score, this.oppScore);
        this.audio.poof();
        this.arena.spawnImpact(center, "dust");
        if (this.net !== null) {
          this.net.send("bscore", { s: this.score });
        }
        return;
      }
    }
    const hit = this.arena.castEnvironment(raycaster);
    if (hit !== null) {
      this.arena.spawnImpact(hit.point, hit.kind);
      this.audio.woodHit();
    }
  }

  fireCoach(raycaster) {
    let banditDist = Infinity;
    let banditHit = null;
    for (const bandit of this.bandits) {
      if (bandit.state === "hidden" || bandit.state === "dying") {
        continue;
      }
      const hits = raycaster.intersectObjects(bandit.cowboy.hitMeshes, false);
      if (hits.length > 0 && hits[0].distance < banditDist) {
        banditDist = hits[0].distance;
        banditHit = bandit;
      }
    }
    let hostageDist = Infinity;
    for (const hostage of this.hostages) {
      const hits = raycaster.intersectObjects(hostage.hitMeshes, false);
      if (hits.length > 0 && hits[0].distance < hostageDist) {
        hostageDist = hits[0].distance;
      }
    }
    if (hostageDist < banditDist) {
      this.audio.thud();
      this.ui.hitFlash();
      this.loseReason = "hostage";
      this.finish(t("defeat"), t("mgBankHostage"), false);
      return;
    }
    if (banditHit !== null) {
      banditHit.state = "dying";
      banditHit.timer = 0;
      banditHit.cowboy.playDeath(this.arena.scene, undefined, true);
      this.audio.thud();
      this.score += 1;
      this.ui.setScore(this.score, 0);
      return;
    }
    const hit = this.arena.castEnvironment(raycaster);
    if (hit !== null) {
      this.arena.spawnImpact(hit.point, hit.kind);
      this.audio.woodHit();
    }
  }

  spawnBird() {
    const rig = makeBird();
    const fromLeft = this.rng() < 0.5;
    const y = 3.2 + this.rng() * 6;
    const z = 20 + this.rng() * 16;
    const speed = (5.5 + this.rng() * 5) * (fromLeft ? 1 : -1);
    rig.group.position.set(fromLeft ? -22 : 22, y, z);
    rig.group.rotation.y = fromLeft ? Math.PI / 2 : -Math.PI / 2;
    this.arena.scene.add(rig.group);
    this.birds.push({ rig: rig, speed: speed, baseY: y, phase: this.rng() * 6, dead: false, fall: null });
  }

  updateBirds(dt) {
    if (this.time >= BIRD_DURATION && !this.finished) {
      this.ui.setGunState("");
      if (this.net === null) {
        this.finish(t("mgTimeUp"), t("mgScoreLine", { s: this.score }));
      } else {
        if (this.doneAt === null) {
          this.doneAt = this.time;
          this.lastDoneSend = -10;
        }
        if (this.time - this.lastDoneSend > 1) {
          this.lastDoneSend = this.time;
          this.net.send("bdone", { s: this.score });
        }
        this.oppDoneSent = true;
        this.maybeFinishBirds();
        if (!this.finished && this.time - this.doneAt > 6) {
          this.oppDone = this.oppScore;
          this.maybeFinishBirds();
        }
      }
      return;
    }
    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0 && this.time < BIRD_DURATION - 3) {
      this.spawnBird();
      this.nextSpawn = 0.9 + this.rng() * 1.4;
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];
      if (bird.dead) {
        bird.fall += dt;
        bird.rig.group.position.y -= 9.8 * bird.fall * dt;
        bird.rig.group.rotation.z += dt * 9;
        if (bird.rig.group.position.y < 0.1) {
          this.arena.scene.remove(bird.rig.group);
          this.birds.splice(i, 1);
        }
        continue;
      }
      bird.rig.group.position.x += bird.speed * dt;
      bird.rig.group.position.y = bird.baseY + Math.sin(this.time * 2.4 + bird.phase) * 0.5;
      const flap = Math.sin(this.time * 11 + bird.phase) * 0.6;
      bird.rig.wingL.rotation.z = flap;
      bird.rig.wingR.rotation.z = -flap;
      if (Math.abs(bird.rig.group.position.x) > 24) {
        this.arena.scene.remove(bird.rig.group);
        this.birds.splice(i, 1);
      }
    }
    const left = Math.max(0, Math.ceil(BIRD_DURATION - this.time));
    this.ui.setRoundLabel(left + " s");
  }

  maybeFinishBirds() {
    if (this.finished || this.oppDone === null || !this.oppDoneSent) {
      return;
    }
    let title = t("mgTie");
    if (this.score > this.oppDone) {
      title = t("victory");
    } else if (this.score < this.oppDone) {
      title = t("defeat");
    }
    this.finish(title, this.score + " - " + this.oppDone);
  }

  banditFireDelay() {
    return (2.1 - this.wave * 0.3) + this.rng() * 0.9;
  }

  updateCoach(dt) {
    if (this.finished) {
      return;
    }
    if (this.pendingWave !== null) {
      this.pendingWave -= dt;
      if (this.pendingWave <= 0) {
        this.pendingWave = null;
        this.wave += 1;
        if (this.wave > WAVES.length) {
          this.finish(t("victory"), this.winDetail(), true);
          return;
        }
        this.toSpawn = WAVES[this.wave - 1];
        this.spawnGap = 0.4;
        this.ui.setBig(t("mgWaveLabel", { n: this.wave }), "gold", 1800);
        this.audio.duelBell();
      }
    }
    if (this.toSpawn > 0) {
      this.spawnGap -= dt;
      if (this.spawnGap <= 0) {
        const idle = this.bandits.filter(function (b) {
          return b.state === "hidden";
        });
        const pool = this.coverPool();
        const taken = this.bandits.map(function (b) {
          return b.state === "hidden" ? -1 : b.cover;
        });
        const free = [];
        for (let ci = 0; ci < pool.length; ci++) {
          if (taken.indexOf(ci) === -1) {
            free.push(ci);
          }
        }
        if (idle.length > 0 && free.length > 0) {
          const bandit = idle[Math.floor(this.rng() * idle.length)];
          const ci = free[Math.floor(this.rng() * free.length)];
          const cover = pool[ci];
          bandit.cover = ci;
          bandit.cowboy.reset();
          let bz = cover[1] + 0.6;
          if (this.mode === "bank") {
            bz = cover[1] + 0.3;
          } else if (this.mode === "town") {
            bz = cover[1] - 0.5;
          }
          const rigPos = this.arena.playerRig.position;
          bandit.cowboy.group.position.set(cover[0], bandit.hideY, bz);
          bandit.cowboy.group.rotation.y = Math.atan2(rigPos.x - cover[0], rigPos.z - bz);
          bandit.cowboy.group.visible = true;
          bandit.state = "rising";
          bandit.timer = 0;
          this.toSpawn -= 1;
          this.spawnGap = 1.2 + this.rng() * 1.4;
        } else {
          this.spawnGap = 0.4;
        }
      }
    }
    let allDone = this.toSpawn === 0 && this.pendingWave === null;
    for (const bandit of this.bandits) {
      bandit.timer += dt;
      if (bandit.state === "rising") {
        bandit.cowboy.group.position.y = Math.min(0, bandit.hideY + bandit.timer * 3.4);
        if (bandit.cowboy.group.position.y >= 0) {
          bandit.state = "aiming";
          bandit.timer = 0;
          bandit.fireAt = this.banditFireDelay();
          bandit.cowboy.playDraw();
        }
      } else if (bandit.state === "aiming") {
        if (bandit.timer >= bandit.fireAt) {
          bandit.state = "ducking";
          bandit.timer = 0;
          bandit.cowboy.playShoot();
          this.audio.distantShot();
          this.coachHp -= 1;
          this.ui.setHearts(Math.max(0, this.coachHp));
          this.shake = 1;
          this.ui.setScore(this.score, 0);
          this.ui.hitFlash();
          if (this.coachHp <= 0) {
            this.finish(t("defeat"), this.loseDetail(), false);
            return;
          }
        }
      } else if (bandit.state === "ducking") {
        if (bandit.timer > 0.7) {
          bandit.cowboy.group.position.y -= dt * 3;
          if (bandit.cowboy.group.position.y <= bandit.hideY) {
            bandit.state = "hidden";
            bandit.cowboy.group.visible = false;
            bandit.cowboy.reset();
          }
        }
      } else if (bandit.state === "dying") {
        if (bandit.timer > 1.2) {
          bandit.state = "hidden";
          bandit.cowboy.group.visible = false;
          bandit.cowboy.reset();
        }
      }
      if (bandit.state !== "hidden") {
        allDone = false;
      }
      bandit.cowboy.update(dt);
    }
    if (allDone && this.wave >= 1 && this.pendingWave === null) {
      if (this.wave >= WAVES.length) {
        this.finish(t("victory"), this.winDetail(), true);
        return;
      }
      this.pendingWave = 2.2;
    }
    this.ui.setRoundLabel(t("mgWaveLabel", { n: Math.max(1, this.wave) }));
  }

  update(now, dt) {
    if (this.disposed) {
      return;
    }
    this.time += dt;
    if (this.time * 1000 >= this.busyUntil) {
      this.ui.setGunState("");
    }
    if (!this.finished) {
      if (this.mode === "birds") {
        this.updateBirds(dt);
      } else {
        this.updateCoach(dt);
      }
    }
    for (const hostage of this.hostages) {
      hostage.update(dt);
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 5);
    }
    const camera = this.arena.camera;
    camera.rotation.order = "YXZ";
    camera.rotation.y = this.aimYaw + (Math.random() - 0.5) * 0.015 * this.shake;
    camera.rotation.x = this.aimPitch + (Math.random() - 0.5) * 0.015 * this.shake;
    camera.rotation.z = 0;
  }

  finish(title, detail, won) {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.won = won === true || (won === undefined && this.mode === "birds");
    if (this.onReward !== null) {
      this.onReward(this.mode, this.score);
    }
    const self = this;
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
    this.ui.hudVisible(false);
    this.ui.crosshair(false);
    if (this.quickEnd !== null) {
      const quick = this.quickEnd;
      const result = this.won;
      const reason = this.loseReason || null;
      this.viewmodel.holster();
      this.ui.setBig(title, this.won ? "gold" : null, 1400);
      this.ui.setSub(detail);
      setTimeout(function () {
        if (!self.disposed) {
          quick(result, reason);
        }
      }, 1500);
      return;
    }
    this.ui.matchEnd(title, detail, function () {}, function () {
      self.exit();
    });
  }

  exit() {
    this.dispose();
    this.onExit();
  }

  dispose() {
    this.disposed = true;
    for (const entry of this.listeners) {
      entry[0].removeEventListener(entry[1], entry[2]);
    }
    this.listeners = [];
    for (const bird of this.birds) {
      this.arena.scene.remove(bird.rig.group);
    }
    this.birds = [];
    for (const b of this.bandits) {
      b.cowboy.reset();
      this.arena.scene.remove(b.cowboy.group);
    }
    this.bandits = [];
    for (const hostage of this.hostages) {
      this.arena.scene.remove(hostage.group);
    }
    this.hostages = [];
    if (this.mode === "bank") {
      this.arena.interiors.hideAll();
    }
    if (this.net !== null) {
      this.net.leave();
      this.net = null;
    }
    if (document.pointerLockElement !== null) {
      document.exitPointerLock();
    }
    this.viewmodel.holster();
    this.ui.hudVisible(false);
    this.ui.crosshair(false);
    this.ui.setBig("", null, 0);
    this.ui.setSub("");
    this.ui.touchControls(false);
  }
}
