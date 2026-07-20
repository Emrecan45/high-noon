import * as THREE from "three";
import { createRng, roundSeed, rangeFrom } from "./rng.js";
import { MODIFIERS, DISTANCE_TIERS, pickModifier, pickDistance } from "./modifiers.js";
import { PERKS, perkById, pickPerkOptions } from "./perks.js";
import { AI_USABLE_PERKS } from "./ai.js";
import { t } from "./i18n.js";
import { skinById, portraitDataUrl, portraitColorsDataUrl } from "./skins.js";
import { renderWantedPosterEl } from "./wanted.js";
import { weaponById } from "./weapons.js";
import { gameplayStart, gameplayStop, happyTime } from "./sdk.js";
import { getMouseSens } from "./settings.js";

const WIN_SCORE = 3;
const TIE_WINDOW = 15;
const BASE_RELOAD = 1300;
const FAST_RELOAD = 780;
const COCK_DELAY = 550;
const DODGE_DURATION = 750;
const DODGE_RECOVERY = 350;
const DODGE_STEP = 2.6;
const CINE_WALK = 2800;
const CINE_TOTAL = 4600;
const YOU_START_Z = 10;
const YOU_END_Z = 2.6;
const OPP_START_Z = -10;
const OPP_END_Z = -2.6;
const SPURS_RECOVERY = 120;
const ROUND_TIMEOUT = 12000;
const FORFEIT_TIMEOUT = 12000;
const PING_INTERVAL = 2500;
const SWAY_BASE = 0.011;
const DODGE_SWAY = 0.05;
const DRAW_PITCH = -0.32;
const DRAW_YAW = 0.12;
const RECOIL_PITCH = 0.055;
const WIND_DRIFT = 0.045;

export class Duel {
  constructor(deps) {
    this.arena = deps.arena;
    this.ui = deps.ui;
    this.audio = deps.audio;
    this.cowboy = deps.cowboy;
    this.viewmodel = deps.viewmodel;
    this.mode = deps.mode;
    this.ai = deps.ai;
    this.net = deps.net;
    this.matchSeed = deps.matchSeed;
    this.onExit = deps.onExit;
    this.isTouch = deps.isTouch;
    this.ranked = false;
    if (deps.ranked) {
      this.ranked = true;
    }
    this.myProfile = null;
    if (deps.profile) {
      this.myProfile = deps.profile;
    }
    this.onResult = deps.onResult;
    this.playerBody = null;
    if (deps.playerBody) {
      this.playerBody = deps.playerBody;
    }
    this.cineStart = 0;
    this.introTimers = [];
    this.onCombat = null;
    if (deps.onCombat) {
      this.onCombat = deps.onCombat;
    }
    this.combatStarted = false;
    this.oppColors = null;
    if (deps.oppColors) {
      this.oppColors = deps.oppColors;
    }
    this.oppOutfit = null;
    if (deps.oppOutfit) {
      this.oppOutfit = deps.oppOutfit;
    }
    this.oppAcc = [];
    if (deps.oppAcc) {
      this.oppAcc = deps.oppAcc;
    }
    this.helloReceived = false;
    this.helloRetry = null;
    this.lastOppMsgAt = 0;
    this.pingTimer = null;
    this.oppPrime = 100;
    this.oppId = null;
    this.oppCode = null;
    this.oppSkin = "drifter";
    this.opponentName = t("theOpponent");
    if (this.mode === "ai") {
      this.opponentName = this.ai.name;
    }
    this.disposed = false;
    this.listeners = [];
    this.aimYaw = 0;
    this.aimPitch = -0.04;
    this.shake = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.glare = 0;
    this.dodgeSwayAmount = 0;
    this.locked = false;
    this.killcamUntil = 0;
    this.syncRetry = null;
    this.oppReadyRound = -1;
    this.oppRematch = false;
    this.rematchAsked = false;
    this.focusedOnce = false;
    this.oppAckedFire = false;
    this.fireResend = null;
    this.bgTimer = null;
    this.bgLast = 0;
    this.forceModifierId = deps.forceModifier || null;
    this.forceDistanceId = deps.forceDistance || null;
    this.storyLine = deps.storyLine || null;
    this.friendly = deps.friendly === true;
    this.onMatchEnd = deps.onMatchEnd || null;
    this.quickEnd = deps.quickEnd || null;
    this.startingOppPerks = deps.oppPerks || null;
    this.comebackPerks = deps.comebackPerks !== false;
    this.prevTopId = deps.prevTopId || null;
    this.resetMatch();
  }

  decorateName(name, id) {
    if (this.prevTopId !== null && id !== null && id === this.prevTopId) {
      return "🏆 " + name;
    }
    return name;
  }

  resetMatch() {
    this.scoreYou = 0;
    this.scoreOpp = 0;
    this.roundIndex = 0;
    this.playerPerks = new Set();
    this.oppPerkIds = new Set();
    if (this.startingOppPerks) {
      for (const id of this.startingOppPerks) {
        this.oppPerkIds.add(id);
        if (this.ai !== null && this.ai !== undefined) {
          this.ai.perks.add(id);
        }
      }
    }
    this.state = "idle";
    this.round = null;
    this.lastModifierId = null;
    this.resultReported = false;
    this.matchStats = {
      shots: 0,
      hits: 0,
      heads: 0
    };
  }

  reportResult(won) {
    if (this.resultReported) {
      return;
    }
    this.resultReported = true;
    if (this.onResult) {
      this.onResult(won, this.oppPrime, this.matchStats, this.oppId);
    }
  }

  startKillcam(now) {
    if (this.killcamUntil > now) {
      return;
    }
    this.killcamUntil = now + 2300;
    this.audio.muffle(true);
    document.body.classList.add("killcam");
  }

  endKillcam() {
    if (this.killcamUntil === 0) {
      return;
    }
    this.killcamUntil = 0;
    this.audio.muffle(false);
    document.body.classList.remove("killcam");
    this.arena.camera.fov = 70;
    this.arena.camera.updateProjectionMatrix();
  }

  timeScale(now) {
    if (this.killcamUntil > now) {
      return 0.3;
    }
    return 1;
  }

  addListener(target, type, handler) {
    target.addEventListener(type, handler);
    this.listeners.push([target, type, handler]);
  }

  start() {
    const self = this;
    this.ui.hudVisible(true);
    this.ui.setScore(0, 0);
    this.ui.touchControls(this.isTouch);

    const canvas = this.arena.renderer.domElement;

    this.addListener(document, "mousemove", function (e) {
      if (self.locked) {
        self.applyAim(e.movementX, e.movementY, 0.0022 * getMouseSens());
      }
    });
    this.addListener(document, "mousedown", function (e) {
      if (self.locked && e.button === 0) {
        self.onFire();
      }
    });
    this.addListener(document, "keydown", function (e) {
      if (e.code === "KeyP") {
        if (self.locked) {
          document.exitPointerLock();
        }
        return;
      }
      if (e.code === "KeyA" || e.code === "KeyQ") {
        self.onDodge(-1);
      } else if (e.code === "KeyD" || e.code === "KeyE") {
        self.onDodge(1);
      }
    });
    this.addListener(document, "pointerlockchange", function () {
      self.locked = document.pointerLockElement === canvas;
      if (!self.isTouch) {
        if (self.locked) {
          self.focusedOnce = true;
          self.ui.showScreen(null);
          if (self.state === "prelock") {
            self.startIntro();
          } else if (self.state === "sync" && !self.readySent) {
            self.sendReadyNow();
          }
        } else if (!self.disposed && self.stateNeedsLock()) {
          self.ui.showScreen("lock-prompt");
        }
      }
    });
    this.addListener(document.getElementById("lock-prompt"), "click", function (e) {
      if (e.target.id === "btn-lock-quit") return;
      if (self.disposed || self.locked) return;
      const elErr = document.getElementById("lock-error");
      if (elErr) elErr.textContent = "";
      try {
        const p = self.arena.renderer.domElement.requestPointerLock();
        if (p) {
          p.catch(err => {
            if (elErr) elErr.textContent = "Navigateur : Veuillez patienter 1 seconde avant de cliquer.";
          });
        }
      } catch (err) {}
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
          const dx = e.touches[0].clientX - lastX;
          const dy = e.touches[0].clientY - lastY;
          lastX = e.touches[0].clientX;
          lastY = e.touches[0].clientY;
          self.applyAim(dx, dy, 0.005);
        }
        e.preventDefault();
      });
      this.addListener(canvas, "touchend", function () {
        tracking = false;
      });
      this.addListener(document.getElementById("btn-fire"), "touchstart", function (e) {
        e.preventDefault();
        self.onFire();
      });
      this.addListener(document.getElementById("btn-dodge-l"), "touchstart", function (e) {
        e.preventDefault();
        self.onDodge(-1);
      });
      this.addListener(document.getElementById("btn-dodge-r"), "touchstart", function (e) {
        e.preventDefault();
        self.onDodge(1);
      });
    } else {
      try {
        canvas.requestPointerLock();
      } catch (err) {}
    }

    if (this.net !== null && this.net !== undefined) {
      this.state = "waithello";
      this.net.onEvent(function (type, payload) {
        self.onRemote(type, payload);
      });
      this.net.onLeft(function () {
        self.onOpponentLeft();
      });
      if (this.myProfile !== null) {
        this.sendHello();
        this.helloRetry = setInterval(function () {
          if (self.disposed || self.helloReceived) {
            self.stopHelloRetry();
            return;
          }
          self.sendHello();
        }, 700);
      }
      this.helloTimer = setTimeout(function () {
        if (!self.disposed && !self.helloReceived) {
          self.cancelDuel();
        }
      }, 9000);
      this.ui.setOppTag("");
    } else {
      this.net = null;
      this.ui.setOppTag(this.opponentName);
    }

    gameplayStart();
    this.startBackgroundTick();
    if (this.net === null) {
      this.presentDuel();
    }
  }

  presentDuel() {
    this.state = "present";
    this.showIntro();
  }

  syncIntroInfo() {
    if (this.state !== "present") {
      return;
    }
    const node = document.getElementById("screen-duelintro");
    if (node.classList.contains("hidden")) {
      return;
    }
    renderWantedPosterEl(document.getElementById("di-you-poster"), {
      pseudo: this.decorateName(this.myProfile.pseudo, this.myProfile.id),
      title: this.ptsLabel(this.myProfile.prime),
      acc: this.myProfile.acc,
      figSrc: portraitDataUrl(this.myProfile.skin, 340, this.myProfile.acc)
    });
    renderWantedPosterEl(document.getElementById("di-opp-poster"), {
      pseudo: this.decorateName(this.opponentName, this.oppId),
      title: this.oppSubtitle(),
      acc: this.oppAcc,
      figSrc: this.oppPortrait()
    });
  }

  ptsLabel(prime) {
    if (!Number.isFinite(Number(prime))) {
      return "";
    }
    return Number(prime) + " $";
  }

  oppSubtitle() {
    if (this.mode === "ai") {
      if (this.ai && this.ai.persona && Number.isFinite(Number(this.ai.persona.bounty))) {
        return this.ptsLabel(this.ai.persona.bounty);
      }
      return t("duelOutlaw");
    }
    return this.ptsLabel(this.oppPrime);
  }

  oppPortrait() {
    if (this.oppColors !== null) {
      return portraitColorsDataUrl(this.oppColors, this.oppAcc, 340, this.oppOutfit);
    }
    return portraitDataUrl(this.oppSkin, 340, this.oppAcc);
  }

  showIntro() {
    const self = this;
    if (this.disposed || this.state === "matchend") {
      return;
    }
    this.state = "present";
    this.ui.hideScreens();
    this.ui.hudVisible(false);
    this.audio.wind();
    this.audio.duelBell();
    const info = {
      you: {
        name: this.decorateName(this.myProfile.pseudo, this.myProfile.id),
        title: this.ptsLabel(this.myProfile.prime),
        acc: this.myProfile.acc,
        portrait: portraitDataUrl(this.myProfile.skin, 340, this.myProfile.acc)
      },
      opp: {
        name: this.decorateName(this.opponentName, this.oppId),
        title: this.oppSubtitle(),
        acc: this.oppAcc,
        portrait: this.oppPortrait()
      }
    };
    if (!this.combatStarted) {
      this.combatStarted = true;
      if (this.onCombat !== null) {
        this.onCombat();
      }
    }
    this.prepareArenaCinematic();
    this.ui.duelIntro(info, 3200, function () {
      if (self.disposed || self.state === "matchend") {
        return;
      }
      self.startArenaCinematic();
    });
  }

  prepareArenaCinematic() {
    if (this.playerBody === null) {
      return;
    }
    this.arena.opponentAnchor.position.set(0, 0, OPP_START_Z);
    this.cowboy.reset();
    this.cowboy.setWalk(false);
    this.playerBody.reset();
    this.playerBody.setSkin(skinById(this.myProfile.skin).colors);
    this.playerBody.setOutfit(skinById(this.myProfile.skin).outfit || null);
    this.playerBody.setWeapon(weaponById(this.myProfile.weapon).colors);
    this.playerBody.setAccessories(this.myProfile.acc);
    this.playerBody.group.position.set(0, 0, YOU_START_Z);
    this.playerBody.group.rotation.set(0, Math.PI, 0);
    this.playerBody.group.visible = true;
    this.playerBody.setWalk(false);
    this.placeCamera(4.2, 3.2, 2.6, 0, 1.4, 1.8);
  }

  startArenaCinematic() {
    const self = this;
    if (this.playerBody === null) {
      this.ui.hideScreens();
      this.ui.hudVisible(true);
      this.beginRoundSync();
      return;
    }
    this.arena.opponentAnchor.position.set(0, 0, OPP_START_Z);
    this.cowboy.reset();
    this.cowboy.setWalk(false);

    this.playerBody.reset();
    this.playerBody.setSkin(skinById(this.myProfile.skin).colors);
    this.playerBody.setOutfit(skinById(this.myProfile.skin).outfit || null);
    this.playerBody.setWeapon(weaponById(this.myProfile.weapon).colors);
    this.playerBody.setAccessories(this.myProfile.acc);
    this.playerBody.group.position.set(0, 0, YOU_START_Z);
    this.playerBody.group.rotation.set(0, Math.PI, 0);
    this.playerBody.group.visible = true;
    this.playerBody.setWalk(false);

    document.getElementById("cine-you-name").textContent = this.decorateName(this.myProfile.pseudo, this.myProfile.id);
    document.getElementById("cine-you-title").textContent = this.ptsLabel(this.myProfile.prime);
    document.getElementById("cine-opp-name").textContent = this.decorateName(this.opponentName, this.oppId);
    document.getElementById("cine-opp-title").textContent = this.oppSubtitle();

    this.ui.hideScreens();
    this.ui.hudVisible(false);
    this.state = "cinematic";
    this.cineStart = performance.now();
    this.cineStepTimer = 0;
    this.updateCinematic(this.cineStart, 0);
    document.getElementById("cine-overlay").classList.remove("hidden");

    this.audio.wind();
    this.introTimers = [];
    this.introTimers.push(setTimeout(function () { self.audio.duelBell(); }, 2900));
    this.introTimers.push(setTimeout(function () { self.audio.duelSting(); }, 4100));
  }

  placeCamera(wx, wy, wz, tx, ty, tz) {
    const cam = this.arena.camera;
    const rig = this.arena.playerRig;
    cam.position.set(wx - rig.position.x, wy - rig.position.y, wz - rig.position.z);
    cam.lookAt(tx, ty, tz);
  }

  projectTag(headObj, id) {
    const node = document.getElementById(id);
    const v = new THREE.Vector3();
    headObj.getWorldPosition(v);
    v.y += 0.5;
    v.project(this.arena.camera);
    if (v.z > 1 || v.x < -1.05 || v.x > 1.05 || v.y < -1.05 || v.y > 1.05) {
      node.style.opacity = "0";
      return;
    }
    node.style.left = ((v.x * 0.5 + 0.5) * 100) + "%";
    node.style.top = ((-v.y * 0.5 + 0.5) * 100) + "%";
    node.style.opacity = "1";
  }

  updateCinematic(now, dt) {
    const el = now - this.cineStart;
    if (el < 0) {
      this.playerBody.group.position.z = YOU_START_Z;
      this.arena.opponentAnchor.position.z = OPP_START_Z;
      this.playerBody.update(dt);
      this.placeCamera(4.2, 3.4, 4.5, 0, 1.5, 0);
      document.getElementById("cine-you-tag").style.opacity = "0";
      document.getElementById("cine-opp-tag").style.opacity = "0";
      return;
    }
    let w = el / CINE_WALK;
    if (w > 1) {
      w = 1;
    }
    const ease = w * w * (3 - 2 * w);
    this.playerBody.group.position.z = YOU_START_Z + (YOU_END_Z - YOU_START_Z) * ease;
    this.arena.opponentAnchor.position.z = OPP_START_Z + (OPP_END_Z - OPP_START_Z) * ease;
    if (w < 1) {
      this.cowboy.setWalk(true);
      this.playerBody.setWalk(true);
      this.cineStepTimer += dt;
      if (this.cineStepTimer > 0.49) {
        this.cineStepTimer = 0;
        this.audio.stepSoft();
      }
    } else {
      this.cowboy.setWalk(false);
      this.playerBody.setWalk(false);
    }
    this.playerBody.update(dt);

    let camx = 0;
    let camy = 0;
    let camz = 0;
    let ty = 0;
    let tz = 0;
    if (el < CINE_WALK) {
      const s = ease;
      camx = 4.2 + (3.4 - 4.2) * s;
      camy = 3.2 + (2.3 - 3.2) * s;
      camz = 2.6 + (0.5 - 2.6) * s;
      ty = 1.4 + (1.55 - 1.4) * s;
      tz = 1.8 * (1 - s);
    } else {
      let p = (el - CINE_WALK) / (CINE_TOTAL - CINE_WALK);
      if (p > 1) {
        p = 1;
      }
      const s = p * p * (3 - 2 * p);
      camx = 3.4 + (2.6 - 3.4) * s;
      camy = 2.3 + (1.95 - 2.3) * s;
      camz = 0.5 + (0 - 0.5) * s;
      ty = 1.55 + (1.62 - 1.55) * s;
      tz = 0;
    }
    this.placeCamera(camx, camy, camz, 0, ty, tz);
    this.projectTag(this.playerBody.head, "cine-you-tag");
    this.projectTag(this.cowboy.head, "cine-opp-tag");

    if (el >= CINE_TOTAL) {
      this.endCinematic();
    }
  }

  endCinematic() {
    this.clearIntroTimers();
    this.cowboy.setWalk(false);
    if (this.playerBody !== null) {
      this.playerBody.setWalk(false);
      this.playerBody.group.visible = false;
    }
    const overlay = document.getElementById("cine-overlay");
    if (overlay !== null) {
      overlay.classList.add("hidden");
    }
    this.arena.camera.position.set(0, 0, 0);
    this.ui.hudVisible(true);
    if (this.disposed || this.state === "matchend") {
      return;
    }
    this.beginRoundSync();
  }

  clearIntroTimers() {
    if (this.introTimers) {
      for (const id of this.introTimers) {
        clearTimeout(id);
      }
      this.introTimers = [];
    }
  }

  startHeartbeat() {
    if (this.pingTimer !== null || this.net === null) {
      return;
    }
    const self = this;
    this.pingTimer = setInterval(function () {
      if (self.disposed || self.net === null) {
        self.stopHeartbeat();
        return;
      }
      self.net.send("ping", {});
    }, PING_INTERVAL);
  }

  stopHeartbeat() {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  checkForfeit(now) {
    if (this.net === null || !this.helloReceived) {
      return;
    }
    if (this.state === "matchend" || this.state === "ended") {
      return;
    }
    if (now - this.lastOppMsgAt > FORFEIT_TIMEOUT) {
      this.onOpponentLeft();
    }
  }

  startBackgroundTick() {
    const self = this;
    this.bgLast = performance.now();
    this.bgTimer = setInterval(function () {
      if (self.disposed) {
        return;
      }
      if (document.hidden) {
        const now = performance.now();
        let dt = (now - self.bgLast) / 1000;
        if (dt > 0.05) {
          dt = 0.05;
        }
        self.bgLast = now;
        self.update(now, dt);
      } else {
        self.bgLast = performance.now();
      }
    }, 33);
  }

  sendHello() {
    if (this.net === null || this.myProfile === null) {
      return;
    }
    this.net.send("hello", {
      id: this.myProfile.id,
      pseudo: this.myProfile.pseudo,
      skin: this.myProfile.skin,
      acc: this.myProfile.acc,
      weapon: this.myProfile.weapon,
      prime: this.myProfile.prime,
      code: this.myProfile.friend_code || null
    });
  }

  stopHelloRetry() {
    if (this.helloRetry !== null) {
      clearInterval(this.helloRetry);
      this.helloRetry = null;
    }
  }

  stateNeedsLock() {
    return this.state === "prelock" || this.state === "intro" || this.state === "waiting" || this.state === "active" || this.state === "sync";
  }

  applyAim(dx, dy, sens) {
    if (this.state !== "active" && this.state !== "waiting" && this.state !== "intro") {
      return;
    }
    this.aimYaw -= dx * sens;
    this.aimPitch -= dy * sens;
    this.aimYaw = Math.max(-0.8, Math.min(0.8, this.aimYaw));
    this.aimPitch = Math.max(-0.5, Math.min(0.45, this.aimPitch));
  }

  reloadDuration() {
    if (this.playerPerks.has("hands")) {
      return FAST_RELOAD;
    }
    return BASE_RELOAD;
  }

  dodgesPerRound() {
    if (this.playerPerks.has("step")) {
      return 3;
    }
    return 2;
  }

  dodgeRecovery() {
    if (this.playerPerks.has("spurs")) {
      return SPURS_RECOVERY;
    }
    return DODGE_RECOVERY;
  }

  maxPlayerHp() {
    if (this.playerPerks.has("vest")) {
      return 3;
    }
    return 2;
  }

  oppMaxHp() {
    if (this.oppPerkIds.has("vest")) {
      return 3;
    }
    return 2;
  }

  beginRoundSync() {
    if (this.net !== null) {
      this.state = "sync";
      this.readySent = false;
      this.ui.setBig("", null, 0);
      this.ui.setSub(t("waitingOpp"));
      this.startSyncDeadline();
      if (this.isTouch || this.locked) {
        this.sendReadyNow();
      } else if (this.focusedOnce) {
        this.requestLock();
      } else {
        this.ui.showScreen("lock-prompt");
      }
    } else if (this.ai && this.ai.persona && this.ai.persona.id === "bot_ranked") {
      this.state = "sync";
      this.readySent = false;
      this.oppReadyRound = -1;
      this.ui.setBig("", null, 0);
      const firstRound = this.roundIndex === 0;
      this.ui.setSub(firstRound ? "" : t("waitingOpp"));

      if (this.isTouch || this.locked) {
        this.sendReadyNow();
      } else if (this.focusedOnce) {
        this.requestLock();
      } else {
        this.ui.showScreen("lock-prompt");
      }

      const self = this;
      const delay = firstRound ? 0 : 2300 + Math.random() * 1700;
      setTimeout(function() {
        if (self.disposed) return;
        self.oppReadyRound = self.roundIndex;
        self.checkSync();
      }, delay);
    } else {
      this.beginRound();
    }
  }

  startSyncDeadline() {
    const self = this;
    this.clearSyncDeadline();
    let left = 30;
    this.syncCountdown = setInterval(function () {
      if (self.disposed || self.state !== "sync") {
        self.clearSyncDeadline();
        return;
      }
      left -= 1;
      if (left <= 0) {
        self.clearSyncDeadline();
        self.onOpponentLeft();
        return;
      }
      if (left <= 20 && self.readySent) {
        self.ui.setSub(t("waitingOpp") + " " + left + " s");
      }
    }, 1000);
  }

  clearSyncDeadline() {
    if (this.syncCountdown) {
      clearInterval(this.syncCountdown);
      this.syncCountdown = null;
    }
  }

  cancelDuel() {
    if (this.disposed || this.state === "matchend") {
      return;
    }
    this.state = "matchend";
    gameplayStop();
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
    const self = this;
    this.ui.hudVisible(false);
    this.ui.matchEnd(
      t("duelCanceled"),
      {
        flavor: t("duelCanceledSub"),
        score: ""
      },
      function () {
        self.exit();
      },
      function () {
        self.exit();
      }
    );
  }

  requestLock() {
    const self = this;
    try {
      this.arena.renderer.domElement.requestPointerLock();
    } catch (err) {}
    setTimeout(function () {
      if (!self.disposed && !self.locked && self.stateNeedsLock()) {
        self.ui.showScreen("lock-prompt");
      }
    }, 450);
  }

  sendReadyNow() {
    this.focusedOnce = true;
    this.readySent = true;
    if (this.net !== null) {
      this.net.send("ready", { round: this.roundIndex });
      this.stopSyncRetry();
      const self = this;
      this.syncRetry = setInterval(function () {
        if (self.state === "sync" && !self.disposed) {
          self.net.send("ready", { round: self.roundIndex });
        } else {
          self.stopSyncRetry();
        }
      }, 900);
    }
    this.checkSync();
  }

  stopSyncRetry() {
    if (this.syncRetry) {
      clearInterval(this.syncRetry);
      this.syncRetry = null;
    }
  }

  checkSync() {
    if (this.state === "sync" && this.readySent && this.oppReadyRound >= this.roundIndex) {
      this.stopSyncRetry();
      this.beginRound();
    }
  }

  beginRound() {
    this.clearSyncDeadline();
    this.stopFireResend();
    if (!this.combatStarted) {
      this.combatStarted = true;
      if (this.onCombat !== null) {
        this.onCombat();
      }
    }
    this.oppAckedFire = false;
    const rng = createRng(roundSeed(this.matchSeed, this.roundIndex));
    let modifier = pickModifier(rng, this.roundIndex, this.lastModifierId);
    if (this.forceModifierId !== null) {
      for (const candidate of MODIFIERS) {
        if (candidate.id === this.forceModifierId) {
          modifier = candidate;
        }
      }
    }
    this.lastModifierId = modifier.id;
    let distance = pickDistance(rng, this.roundIndex);
    if (this.forceDistanceId !== null) {
      for (const candidate of DISTANCE_TIERS) {
        if (candidate.id === this.forceDistanceId) {
          distance = candidate;
        }
      }
    }
    const signalDelay = 1800 + rng() * 3200;
    const distractions = [];
    const distractionCount = Math.floor(rng() * 3);
    for (let i = 0; i < distractionCount; i++) {
      const at = 600 + rng() * (signalDelay - 1200);
      let kind = "crow";
      if (rng() < 0.5) {
        kind = "bang";
      }
      distractions.push({ at: at, kind: kind, done: false });
    }
    const glareEvents = [];
    const glareCount = Math.floor(rng() * 3);
    for (let i = 0; i < glareCount; i++) {
      glareEvents.push({ at: 500 + rng() * (signalDelay - 900), dur: 1100 + rng() * 700 });
    }
    const fogPulses = [];
    if (modifier.id === "fog") {
      const pulseCount = 2 + Math.floor(rng() * 3);
      let cursor = 400 + rng() * 800;
      for (let i = 0; i < pulseCount; i++) {
        const dur = 900 + rng() * 1200;
        fogPulses.push({ at: cursor, dur: dur });
        cursor += dur + 500 + rng() * 1200;
      }
    }

    this.round = {
      modifier: modifier,
      distance: distance,
      signalDelay: signalDelay,
      distractions: distractions,
      glareEvents: glareEvents,
      fogPulses: fogPulses,
      signalTime: 0,
      playerHp: this.maxPlayerHp(),
      oppHp: this.oppMaxHp(),
      playerDodges: this.dodgesPerRound(),
      stepX: 0,
      playerDodgeUntil: 0,
      playerBusyUntil: 0,
      dodgeCooldownUntil: 0,
      dodgeWindows: [],
      playerDrawn: false,
      playerFirstShotT: null,
      oppShotT: null,
      playerDead: false,
      oppDead: false,
      myKillerT: null,
      oppDeathShotT: null,
      resolveAt: null,
      resolved: false,
      deathAnimT: 0
    };

    this.arena.applyModifier(modifier, distance.meters);
    this.cowboy.reset();
    this.viewmodel.holster();
    this.aimYaw = 0;
    this.aimPitch = -0.04;
    this.glare = 0;
    this.dodgeSwayAmount = 0;
    this.ui.setGlare(0);

    this.ui.setRoundLabel(t("roundLabel", { n: this.roundIndex + 1, mod: t(modifier.nameKey) }));
    this.ui.setHearts(this.round.playerHp);
    this.ui.setDodges(this.round.playerDodges);
    this.ui.setGunState("");
    this.ui.crosshair(false);

    if (this.ai !== null && this.ai !== undefined) {
      this.ai.startRound({
        signalDelay: signalDelay,
        modifier: modifier,
        distance: distance,
        roundIndex: this.roundIndex
      });
    }

    if (!this.isTouch && !this.locked && this.net === null && !this.ranked) {
      this.state = "prelock";
      if (this.focusedOnce) {
        this.requestLock();
      } else {
        this.ui.showScreen("lock-prompt");
      }
    } else {
      this.startIntro();
    }
  }

  startIntro() {
    this.audio.reveal();
    this.ui.setBig(t(this.round.modifier.nameKey), "gold", 3400);
    if (this.storyLine !== null && this.roundIndex === 0) {
      this.ui.setSub(this.storyLine);
    } else {
      this.ui.setSub(t(this.round.modifier.descKey));
    }
    this.state = "intro";
    this.introUntil = performance.now() + 3600;
  }

  fireSignal(now) {
    this.state = "active";
    this.round.signalTime = now;
    this.audio.bell();
    this.ui.setBig(t("fire"), "fire", 1300);
    this.ui.setSub("");
    this.ui.setGunState(t("drawPrompt"));
  }

  playerDraw(now) {
    this.round.playerDrawn = true;
    this.ui.setGunState("");
    this.ui.crosshair(true);
    this.viewmodel.draw();
    this.audio.reloadClick(0);
    let drawScale = 1;
    if (this.playerPerks.has("draw")) {
      drawScale = 0.55;
    }
    this.aimYaw = (DRAW_YAW + (Math.random() - 0.5) * 0.34) * drawScale;
    this.aimPitch = (DRAW_PITCH + (Math.random() - 0.5) * 0.2) * drawScale;
    this.round.playerBusyUntil = now + 140;
  }

  startFireResend() {
    this.stopFireResend();
    const self = this;
    let count = 0;
    this.net.send("fire", { round: this.roundIndex });
    this.fireResend = setInterval(function () {
      count += 1;
      if (self.disposed || self.oppAckedFire || count > 16) {
        self.stopFireResend();
        return;
      }
      self.net.send("fire", { round: self.roundIndex });
    }, 220);
  }

  stopFireResend() {
    if (this.fireResend !== null) {
      clearInterval(this.fireResend);
      this.fireResend = null;
    }
  }

  tSignal(now) {
    if (this.state === "waiting") {
      return now - this.waitStart - this.round.signalDelay;
    }
    return now - this.round.signalTime;
  }

  playerCanAct(now) {
    if (this.round.playerDead || this.round.resolved) {
      return false;
    }
    return now >= this.round.playerBusyUntil;
  }

  onFire() {
    const now = performance.now();
    if (this.state === "waiting" || this.state === "intro") {
      this.playerEarlyAction("fire");
      return;
    }
    if (this.state !== "active") {
      return;
    }
    if (this.round.playerDead || this.round.resolved) {
      return;
    }
    if (!this.round.playerDrawn) {
      this.playerDraw(now);
      return;
    }
    if (now < this.round.playerBusyUntil) {
      return;
    }
    const shotT = Math.round(this.tSignal(now));
    if (this.round.playerFirstShotT === null) {
      this.round.playerFirstShotT = shotT;
    }
    this.viewmodel.shoot();
    this.audio.gunshot();
    this.shake = 1;

    const part = this.castShot();
    this.aimPitch = Math.min(0.45, this.aimPitch + RECOIL_PITCH);
    this.matchStats.shots += 1;
    if (part === "head") {
      this.matchStats.heads += 1;
      this.matchStats.hits += 1;
    } else if (part === "body") {
      this.matchStats.hits += 1;
    } else if (part === null) {
      this.spawnMissImpact();
    }

    if (this.net !== null) {
      this.net.send("shot", { t: shotT, part: part });
      if (part === "hat") {
        this.cowboy.playHatShot(this.arena.scene);
        this.startReload(now, this.reloadDuration());
      } else if (part === null) {
        this.startReload(now, this.reloadDuration());
      } else {
        this.startReload(now, this.reloadDuration());
        this.ui.setGunState("");
      }
      return;
    }

    if (part === null) {
      this.startReload(now, this.reloadDuration());
      this.ai.onPlayerMiss(shotT);
    } else if (part === "hat") {
      this.cowboy.playHatShot(this.arena.scene);
      this.startReload(now, this.reloadDuration());
      this.ai.onPlayerMiss(shotT);
    } else if (part === "head") {
      this.opponentDies(shotT);
    } else {
      this.round.oppHp -= 1;
      if (this.round.oppHp <= 0) {
        this.opponentDies(shotT);
      } else {
        this.cowboy.playFlinch();
        this.cowboy.setWounded();
        this.ai.notifyWounded();
        this.ui.setSub(t("hitSub"), 900);
        this.startReload(now, this.reloadDuration());
      }
    }
  }

  spawnMissImpact() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(this.swayX, this.swayY), this.arena.camera);
    const hit = this.arena.castEnvironment(raycaster);
    if (hit !== null) {
      this.arena.shotImpact(hit.point, hit.kind);
    }
  }

  spawnNearImpact() {
    const rig = this.arena.playerRig;
    let side = 1 + Math.random() * 1.5;
    if (Math.random() < 0.5) {
      side = -side;
    }
    const point = new THREE.Vector3(rig.position.x + side, 0.02, rig.position.z - 1 - Math.random() * 2.5);
    this.arena.shotImpact(point, "dust");
  }

  castShot() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(this.swayX, this.swayY), this.arena.camera);
    const hits = raycaster.intersectObjects(this.cowboy.hitMeshes, false);
    for (const hit of hits) {
      const part = hit.object.userData.part;
      if (part === "hat") {
        if (this.cowboy.isHatGone()) {
          continue;
        }
        return "hat";
      }
      if (part === "head" || part === "body") {
        return part;
      }
      return "body";
    }
    if (this.playerPerks.has("eye")) {
      const headPos = new THREE.Vector3();
      this.cowboy.head.getWorldPosition(headPos);
      const sphere = new THREE.Sphere(headPos, 0.34);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectSphere(sphere, point) !== null) {
        return "head";
      }
    }
    return null;
  }

  startReload(now, duration) {
    this.round.playerBusyUntil = now + duration;
    this.viewmodel.reload(duration / 1000);
    this.ui.setGunState(t("reloading"));
  }

  onDodge(dir) {
    const now = performance.now();
    if (this.state === "waiting" || this.state === "intro") {
      this.playerEarlyAction("dodge", dir);
      return;
    }
    if (this.state !== "active" && this.state !== "waiting") {
      return;
    }
    if (this.round.playerDead || this.round.resolved) {
      return;
    }
    if (now < this.round.dodgeCooldownUntil) {
      return;
    }
    if (this.round.playerDodges <= 0) {
      return;
    }
    const nextStep = Math.max(-DODGE_STEP, Math.min(DODGE_STEP, this.round.stepX + dir * 1.5));
    if (nextStep === this.round.stepX) {
      return;
    }
    const dodgeT = Math.round(this.tSignal(now));
    this.round.playerDodges -= 1;
    this.ui.setDodges(this.round.playerDodges);
    this.round.stepX = nextStep;
    this.round.playerDodgeUntil = now + DODGE_DURATION;
    this.round.dodgeCooldownUntil = now + DODGE_DURATION + this.dodgeRecovery();
    this.round.dodgeWindows.push([dodgeT - 40, dodgeT + DODGE_DURATION]);
    this.audio.whoosh();
    this.audio.step();
    if (this.net !== null) {
      this.net.send("dodge", { t: dodgeT, dir: dir });
    } else {
      this.ai.onPlayerDodge(dodgeT);
    }
  }

  playerEarlyAction(action, dir) {
    if (this.round === null || this.round.resolved) {
      return;
    }
    this.round.resolved = true;

    if (action === "fire") {
      this.viewmodel.draw();
      this.viewmodel.shoot();
      this.audio.gunshot();
    } else if (action === "dodge") {
      this.round.playerDodges -= 1;
      this.ui.setDodges(this.round.playerDodges);
      this.round.stepX = Math.max(-DODGE_STEP, Math.min(DODGE_STEP, this.round.stepX + dir * 1.5));
      this.audio.whoosh();
      this.audio.step();
    }

    this.ui.setBig(t("earlyDraw"), "fire", 1900);
    if (action === "dodge") {
      this.ui.setSub(t("earlyDodgeSub"), 1800);
    } else {
      this.ui.setSub(t("earlyDrawSub"), 1800);
    }
    
    if (this.net !== null) {
      this.net.send("misfire", { action: action, dir: dir });
    } else {
      this.ai.stop();
    }
    const self = this;
    setTimeout(function () {
      self.endRound("opp", t("reasonEarlyYou", { name: self.opponentName }));
    }, 1500);
  }

  opponentDies(shotT) {
    if (this.round.oppDead) {
      return;
    }
    this.round.oppDead = true;
    this.round.oppDeathShotT = shotT;
    this.cowboy.playDeath(this.arena.scene, 0.2);
    this.audio.thud();
    this.ui.setBig(t("down"), "gold", 1500);
    if (!this.round.playerDead) {
      this.ui.setScore(this.scoreYou + 1, this.scoreOpp);
    }
    if (this.ai !== null && this.ai !== undefined) {
      this.ai.stop();
    }
    if (this.ui) {
      this.ui.setSub(t("killSub"), 1000);
    }
    this.startKillcam(performance.now());
    this.scheduleResolve();
  }

  playerDies(killerShotT) {
    if (this.round.playerDead) {
      return;
    }
    this.round.playerDead = true;
    this.round.myKillerT = killerShotT;
    this.round.deathAnimT = 0;
    this.ui.hitFlash();
    this.audio.thud();
    this.ui.setBig(t("youFell"), "fire", 2600);
    this.ui.crosshair(false);
    if (!this.round.oppDead) {
      this.ui.setScore(this.scoreYou, this.scoreOpp + 1);
    }
    if (this.net !== null) {
      this.net.send("death", { shotT: killerShotT });
    } else {
      this.ai.stop();
    }
    this.startKillcam(performance.now());
    this.scheduleResolve();
  }

  scheduleResolve() {
    if (this.round.resolveAt === null) {
      let delay = 1500;
      if (this.killcamUntil > performance.now()) {
        delay = 2700;
      }
      this.round.resolveAt = performance.now() + delay;
    }
    this.round.resolved = true;
  }

  finalizeRound() {
    const r = this.round;
    let winner = null;
    let reason = "";
    if (r.oppDead && r.playerDead) {
      if (r.oppDeathShotT !== null && r.myKillerT !== null && Math.abs(r.myKillerT - r.oppDeathShotT) > TIE_WINDOW && r.oppDeathShotT < r.myKillerT) {
        winner = "you";
        reason = t("reasonBothYou");
      } else if (r.oppDeathShotT !== null && r.myKillerT !== null && Math.abs(r.myKillerT - r.oppDeathShotT) > TIE_WINDOW && r.myKillerT < r.oppDeathShotT) {
        winner = "opp";
        reason = t("reasonBothOpp");
      } else {
        winner = null;
        reason = t("reasonBothNone");
      }
    } else if (r.oppDead) {
      winner = "you";
      reason = t("reasonOppDown", { name: this.opponentName });
    } else if (r.playerDead) {
      winner = "opp";
      reason = t("reasonYouDown");
    } else {
      winner = null;
      reason = t("reasonNobody");
    }
    this.endRound(winner, reason);
  }

  endRound(winner, reason) {
    if (this.disposed || this.state === "ended" || this.state === "matchend") {
      return;
    }
    this.state = "ended";
    this.ui.setSub("");
    this.ui.setGunState("");
    this.ui.crosshair(false);

    if (winner === "you") {
      this.scoreYou += 1;
    } else if (winner === "opp") {
      this.scoreOpp += 1;
    }
    this.ui.setScore(this.scoreYou, this.scoreOpp);

    if (this.scoreYou >= WIN_SCORE || this.scoreOpp >= WIN_SCORE) {
      this.showMatchEnd();
      return;
    }

    let title = t("roundDraw");
    if (winner === "you") {
      title = t("roundWon");
    } else if (winner === "opp") {
      title = t("roundLost");
    }

    const self = this;
    this.ui.roundEnd(title, reason, "", function () {
      self.afterRoundPanel(winner);
    }, function () {
      self.exit();
    });
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
  }

  afterRoundPanel(winner) {
    const self = this;
    if (this.comebackPerks) {
      if (winner === "opp") {
        const options = pickPerkOptions(this.playerPerks, 3);
        if (options.length > 0) {
          this.ui.perkChoice(options, function (id) {
            self.playerPerks.add(id);
            if (self.net !== null) {
              self.net.send("perk", { id: id });
            }
            self.nextRound();
          });
          return;
        }
      } else if (winner === "you" && this.ai !== null && this.ai !== undefined) {
        const availableOpp = PERKS.filter(function (perk) {
          return !self.oppPerkIds.has(perk.id) && AI_USABLE_PERKS.indexOf(perk.id) !== -1;
        });
        if (availableOpp.length > 0) {
          const id = this.ai.pickPerk(availableOpp);
          this.oppPerkIds.add(id);
          this.ai.perks.add(id);
          const perk = perkById(id);
          this.ui.setSub(t("oppPicks", { name: this.opponentName, perk: t(perk.nameKey) }));
          setTimeout(function () {
            self.ui.setSub("");
          }, 2200);
        }
      }
    }
    this.nextRound();
  }

  nextRound() {
    this.roundIndex += 1;
    this.beginRoundSync();
  }

  showMatchEnd() {
    const self = this;
    const score = this.scoreYou + " - " + this.scoreOpp;
    const sentinel = "⁣";
    const won = this.scoreYou > this.scoreOpp;
    let title = t("defeat");
    let flavor = t("defeatDetail", { name: this.opponentName, score: sentinel });
    if (won) {
      title = t("victory");
      flavor = t("victoryDetail", { score: sentinel });
      this.audio.victory();
      happyTime();
    } else {
      this.audio.defeat();
    }
    flavor = flavor.split(sentinel)[0].replace(/\s+$/, "");
    gameplayStop();
    this.reportResult(won);
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
    this.ui.hudVisible(false);
    this.state = "matchend";
    if (this.quickEnd !== null) {
      const quick = this.quickEnd;
      setTimeout(function () {
        if (!self.disposed) {
          quick(won);
        }
      }, 1100);
      return;
    }
    this.ui.matchEnd(title, { flavor: flavor, score: score, stats: this.matchStats }, function () {
      self.requestRematch();
    }, function () {
      self.exit();
    });
    this.maybeFriendPrompt();
  }

  maybeFriendPrompt() {
    if (this.net === null || !this.friendly || this.onMatchEnd === null) {
      return;
    }
    this.onMatchEnd(this.oppId, this.opponentName, this.oppCode);
  }

  requestRematch() {
    if (this.net === null) {
      this.matchSeed = (this.matchSeed + 1017) >>> 0;
      this.resetMatch();
      this.ui.setScore(0, 0);
      if (!this.isTouch) {
        this.ui.showScreen("lock-prompt");
      }
      gameplayStart();
      this.beginRoundSync();
      return;
    }
    this.rematchAsked = true;
    this.net.send("rematch", {});
    this.ui.matchEnd(t("waitingTitle"), t("waitingRematch", { name: this.opponentName }), function () {}, this.exit.bind(this));
    this.checkRematch();
  }

  checkRematch() {
    if (this.rematchAsked && this.oppRematch) {
      this.rematchAsked = false;
      this.oppRematch = false;
      this.oppReadyRound = -1;
      this.matchSeed = (this.matchSeed + 1017) >>> 0;
      this.resetMatch();
      this.ui.setScore(0, 0);
      this.ui.hideScreens();
      if (!this.isTouch) {
        this.ui.showScreen("lock-prompt");
      }
      gameplayStart();
      this.beginRoundSync();
    }
  }

  onRemote(type, payload) {
    if (this.disposed) {
      return;
    }
    const now = performance.now();
    this.lastOppMsgAt = now;
    if (type === "hello") {
      if (this.helloReceived) {
        this.sendHello();
        return;
      }
      if (this.helloTimer) {
        clearTimeout(this.helloTimer);
        this.helloTimer = null;
      }
      this.opponentName = String(payload.pseudo);
      this.oppPrime = 100;
      if (Number.isFinite(payload.prime)) {
        this.oppPrime = payload.prime;
      }
      this.oppId = null;
      if (typeof payload.id === "string" && payload.id.length > 10) {
        this.oppId = payload.id;
      }
      this.oppCode = null;
      if (typeof payload.code === "string" && payload.code.length > 0) {
        this.oppCode = payload.code;
      }
      this.oppSkin = payload.skin;
      this.oppColors = null;
      this.cowboy.setSkin(skinById(payload.skin).colors);
      this.cowboy.setOutfit(skinById(payload.skin).outfit || null);
      this.cowboy.setAccessories(payload.acc);
      this.cowboy.setWeapon(weaponById(payload.weapon).colors);
      this.ui.setOppTag(this.opponentName + " - " + this.ptsLabel(this.oppPrime));
      this.syncIntroInfo();
      this.helloReceived = true;
      this.startHeartbeat();
      if (this.state === "waithello") {
        this.presentDuel();
      }
    } else if (type === "ping") {
      return;
    } else if (type === "ready") {
      this.oppReadyRound = Math.max(this.oppReadyRound, payload.round);
      this.checkSync();
    } else if (type === "fire") {
      if (this.net !== null && !this.net.isHost && payload.round === this.roundIndex && this.round !== null) {
        if (this.round.signalTime !== 0) {
          this.net.send("ackfire", { round: payload.round });
        } else if ((this.state === "waiting" || this.state === "intro") && !this.round.resolved) {
          if (this.state === "intro") {
            this.waitStart = now;
          }
          this.fireSignal(now);
          this.net.send("ackfire", { round: payload.round });
        }
      }
    } else if (type === "ackfire") {
      if (payload.round === this.roundIndex) {
        this.oppAckedFire = true;
        this.stopFireResend();
      }
    } else if (type === "misfire") {
      if (this.state === "waiting" || this.state === "active" || this.state === "intro" || this.state === "prelock") {
        this.round.resolved = true;
        if (payload && payload.action === "dodge") {
          this.cowboy.playDodge(payload.dir);
          this.audio.whoosh();
          this.audio.step();
        } else {
          this.cowboy.playDraw();
          this.cowboy.playShoot();
          this.audio.distantShot();
        }
        this.ui.setBig(t("oppEarly"), "gold", 2000);
        const self = this;
        setTimeout(function () {
          self.endRound("you", t("reasonEarlyOpp", { name: self.opponentName }));
        }, 1500);
      }
    } else if (type === "dodge") {
      this.cowboy.playDodge(payload.dir);
    } else if (type === "shot") {
      this.handleRemoteShot(payload, now);
    } else if (type === "dodged") {
    } else if (type === "wounded") {
      this.cowboy.playFlinch();
      this.cowboy.setWounded();
      this.ui.setSub(t("hitSub"), 900);
    } else if (type === "death") {
      this.opponentDies(payload.shotT);
    } else if (type === "perk") {
      const perk = perkById(payload.id);
      if (perk !== null) {
        this.oppPerkIds.add(perk.id);
        this.ui.setSub(t("oppPicks", { name: this.opponentName, perk: t(perk.nameKey) }));
      }
    } else if (type === "rematch") {
      this.oppRematch = true;
      this.checkRematch();
    }
  }

  handleRemoteShot(payload, now) {
    if (this.state !== "active" && this.state !== "waiting") {
      return;
    }
    this.cowboy.playDraw();
    this.cowboy.playShoot();
    this.audio.distantShot();
    if (this.round.oppShotT === null) {
      this.round.oppShotT = payload.t;
    }
    if (payload.part === null) {
      this.spawnNearImpact();
      return;
    }
    if (payload.part === "hat") {
      return;
    }
    if (this.round.playerDead || this.round.resolved) {
      return;
    }
    for (const window of this.round.dodgeWindows) {
      if (payload.t >= window[0] && payload.t <= window[1]) {
        this.net.send("dodged", { t: payload.t });
        return;
      }
    }
    if (payload.part === "head") {
      this.playerDies(payload.t);
      return;
    }
    this.round.playerHp -= 1;
    this.ui.setHearts(Math.max(0, this.round.playerHp));
    this.ui.hitFlash();
    this.audio.thud();
    this.shake = 1.4;
    if (this.round.playerHp <= 0) {
      this.playerDies(payload.t);
    } else {
      this.net.send("wounded", {});
      this.ui.setSub(t("hitSub"), 900);
    }
  }

  handleAiEvents(now) {
    if (this.ai === null || this.ai === undefined) {
      return;
    }
    const sigT = this.tSignal(now);
    const events = this.ai.update(sigT);
    for (const evt of events) {
      if (evt.type === "draw") {
        this.cowboy.playDraw();
      } else if (evt.type === "reload") {
        this.cowboy.playReload();
        setTimeout(this.audio.reloadClick.bind(this.audio, 1), 200);
      } else if (evt.type === "dodge") {
        this.cowboy.playDodge(evt.dir);
      } else if (evt.type === "misfire") {
        this.aiMisfire();
      } else if (evt.type === "shoot") {
        this.aiShoots(evt, now);
      }
    }
  }

  aiMisfire() {
    if (this.round.resolved) {
      return;
    }
    this.round.resolved = true;
    this.cowboy.playDraw();
    this.cowboy.playShoot();
    this.audio.distantShot();
    this.ui.setBig(t("oppEarly"), "gold", 2000);
    this.ai.stop();
    const self = this;
    setTimeout(function () {
      self.endRound("you", t("reasonEarlyOpp", { name: self.opponentName }));
    }, 1500);
  }

  aiShoots(evt, now) {
    if (this.round.resolved || this.round.oppDead) {
      return;
    }
    this.cowboy.playShoot();
    this.audio.distantShot();
    if (this.round.oppShotT === null) {
      this.round.oppShotT = Math.round(evt.t);
    }
    const dodging = now < this.round.playerDodgeUntil;
    if (dodging) {
      if (evt.result !== "miss") {
        this.ai.onShotDodged(this.tSignal(now));
      }
      return;
    }
    if (evt.result === "miss") {
      this.spawnNearImpact();
      return;
    }
    if (this.round.playerDead) {
      return;
    }
    if (evt.result === "head") {
      this.playerDies(Math.round(evt.t));
      return;
    }
    this.round.playerHp -= 1;
    this.ui.setHearts(Math.max(0, this.round.playerHp));
    this.ui.hitFlash();
    this.audio.thud();
    this.shake = 1.4;
    if (this.round.playerHp <= 0) {
      this.playerDies(Math.round(evt.t));
    } else {
      this.ui.setSub(t("hitSub"), 900);
      this.ai.onShotDodged(this.tSignal(now));
    }
  }

  onOpponentLeft() {
    if (this.disposed) {
      return;
    }
    if (this.state === "matchend") {
      return;
    }
    this.state = "matchend";
    gameplayStop();
    this.reportResult(true);
    const self = this;
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
    this.ui.hudVisible(false);
    this.ui.matchEnd(
      t("fled"),
      {
        flavor: t("fledDetail", { name: this.opponentName }),
        score: ""
      },
      function () {
      self.exit();
      },
      function () {
      self.exit();
      }
    );
    this.maybeFriendPrompt();
  }

  update(now, dt) {
    if (this.disposed) {
      return;
    }

    if (this.killcamUntil > 0 && now >= this.killcamUntil) {
      this.endKillcam();
    }

    this.checkForfeit(now);

    if (this.state === "present") {
      return;
    }

    if (this.state === "cinematic") {
      this.updateCinematic(now, dt);
      return;
    }

    if (this.state === "intro") {
      if (!this.isTouch && !this.locked && this.net === null && !this.ranked) {
        this.introUntil += dt * 1000;
      } else if (now >= this.introUntil) {
        this.state = "waiting";
        this.waitStart = now;
        this.ui.setSub(t("waitSignal"));
      }
    } else if (this.state === "waiting") {
      if (!this.isTouch && !this.locked && this.net === null && !this.ranked) {
        this.waitStart += dt * 1000;
      }
      const waited = now - this.waitStart;
      for (const distraction of this.round.distractions) {
        if (!distraction.done && waited >= distraction.at) {
          distraction.done = true;
          if (distraction.kind === "crow") {
            this.audio.crow();
          } else {
            this.audio.bang();
            this.shake = 0.6;
          }
        }
      }
      if (!this.round.resolved && this.round.signalTime === 0 && waited >= this.round.signalDelay) {
        if (this.net === null || this.net.isHost) {
          this.fireSignal(now);
          if (this.net !== null) {
            this.startFireResend();
          }
        } else if (waited >= this.round.signalDelay + 6000) {
          this.fireSignal(now);
        }
      }
      this.handleAiEvents(now);
    } else if (this.state === "active") {
      this.handleAiEvents(now);
      if (this.round.playerBusyUntil > 0 && now >= this.round.playerBusyUntil && !this.round.playerDead) {
        if (this.ui !== null) {
          this.ui.setGunState("");
        }
      }
      if (this.round.resolveAt !== null && now >= this.round.resolveAt) {
        this.round.resolveAt = null;
        this.finalizeRound();
      }
      if (!this.round.resolved && this.tSignal(now) > ROUND_TIMEOUT) {
        this.round.resolved = true;
        this.finalizeRound();
      }
    }

    this.updateFog(now, dt);
    this.updateGlare(now, dt);
    this.updateCamera(now, dt);
  }

  updateFog(now, dt) {
    if (this.round === null || this.round.modifier.id !== "fog") {
      return;
    }
    const inRound = this.state === "waiting" || this.state === "active";
    if (!inRound) {
      return;
    }
    const waited = now - this.waitStart;
    let active = false;
    for (const pulse of this.round.fogPulses) {
      if (waited >= pulse.at && waited < pulse.at + pulse.dur) {
        active = true;
        break;
      }
    }
    this.arena.setFogPulse(active, dt);
  }

  updateGlare(now, dt) {
    if (this.round === null) {
      return;
    }
    let intensity = 0;
    const modifier = this.round.modifier;
    const sunny = modifier.id === "noon";
    const inRound = this.state === "waiting" || this.state === "active";
    if (sunny && inRound && !this.playerPerks.has("brim")) {
      const waited = now - this.waitStart;
      for (const evt of this.round.glareEvents) {
        const local = waited - evt.at;
        if (local > 0 && local < evt.dur) {
          const phase = local / evt.dur;
          let env = 0;
          if (phase < 0.22) {
            env = phase / 0.22;
          } else if (phase < 0.5) {
            env = 1;
          } else {
            env = 1 - (phase - 0.5) / 0.5;
          }
          env = Math.min(1, Math.max(0, env));
          if (env > intensity) {
            intensity = env;
          }
        }
      }
    }
    if (intensity > 0) {
      const sunPos = new THREE.Vector3();
      this.arena.sunDisc.getWorldPosition(sunPos);
      sunPos.project(this.arena.camera);
      if (sunPos.z > 1) {
        intensity = 0;
      } else {
        const off = Math.max(Math.abs(sunPos.x), Math.abs(sunPos.y));
        if (off > 1) {
          intensity *= Math.max(0, 1 - (off - 1) / 0.5);
        }
        this.ui.setGlarePos((0.5 + sunPos.x / 2) * 100, (0.5 - sunPos.y / 2) * 100, (now * 0.012) % 360);
      }
    }
    this.glare += (intensity - this.glare) * Math.min(1, dt * 8);
    this.ui.setGlare(this.glare);
  }

  updateCamera(now, dt) {
    const camera = this.arena.camera;
    const rig = this.arena.playerRig;

    let amp = SWAY_BASE;
    if (this.playerPerks.has("calm")) {
      amp *= 0.5;
    }
    let dodgeSwayTarget = 0;
    if (this.round !== null && now < this.round.playerDodgeUntil) {
      dodgeSwayTarget = DODGE_SWAY;
    }
    if (this.viewmodel && this.viewmodel.state && this.viewmodel.state.mode === "reloading") {
      dodgeSwayTarget += 0.35;
    }
    this.dodgeSwayAmount += (dodgeSwayTarget - this.dodgeSwayAmount) * Math.min(1, dt * 6);
    amp += this.dodgeSwayAmount;
    const time = now / 1000;
    let driftX = 0;
    let driftY = 0;
    if (this.round !== null && this.round.modifier.sway > 0) {
      driftX = (Math.sin(time * 0.5) * 0.7 + Math.sin(time * 1.9 + 2.1) * 0.3) * WIND_DRIFT * 3;
      driftY = Math.sin(time * 1.1 + 0.7) * WIND_DRIFT * 1.3;
    }
    this.swayX = Math.sin(time * 0.85) * amp + driftX;
    this.swayY = Math.sin(time * 1.35 + 1.1) * amp * 0.7 + driftY;
    this.ui.moveCrosshair(this.swayX, this.swayY);

    let killTracking = false;
    if (this.killcamUntil > now && this.round !== null && this.round.oppDead && !this.round.playerDead) {
      killTracking = true;
      const target = new THREE.Vector3();
      this.cowboy.group.getWorldPosition(target);
      target.y += 0.8;
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const dx = target.x - camPos.x;
      const dy = target.y - camPos.y;
      const dz = target.z - camPos.z;
      const yaw = Math.atan2(-dx, -dz);
      const pitch = Math.atan2(dy, Math.hypot(dx, dz));
      const track = Math.min(1, dt * 12);
      this.aimYaw += (yaw - this.aimYaw) * track;
      this.aimPitch += (pitch - this.aimPitch) * track;
    }
    let fovTarget = 70;
    if (killTracking) {
      fovTarget = 32;
    }
    if (Math.abs(camera.fov - fovTarget) > 0.1) {
      camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 8);
      camera.updateProjectionMatrix();
    }

    let shakeYaw = 0;
    let shakePitch = 0;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 5);
      shakeYaw = (Math.random() - 0.5) * 0.02 * this.shake;
      shakePitch = (Math.random() - 0.5) * 0.02 * this.shake;
    }

    camera.rotation.order = "YXZ";
    camera.rotation.y = this.aimYaw + shakeYaw;
    camera.rotation.x = this.aimPitch + shakePitch;

    let targetX = 0;
    if (this.round !== null) {
      targetX = this.round.stepX;
    }
    const lean = (targetX - rig.position.x) * 0.14;
    rig.position.x += (targetX - rig.position.x) * Math.min(1, dt * 9);

    if (this.round !== null && this.round.playerDead) {
      this.round.deathAnimT = Math.min(1, this.round.deathAnimT + dt * 1.4);
      const e = this.round.deathAnimT * this.round.deathAnimT;
      rig.position.y = 1.6 - e * 1.1;
      camera.rotation.z = e * 0.6;
    } else {
      rig.position.y = 1.6;
      camera.rotation.z = lean;
    }
  }

  exit() {
    try {
      this.reportResult(false);
      this.dispose();
    } catch (e) {
      console.error(e);
    }
    this.onExit();
  }

  dispose() {
    this.disposed = true;
    this.ui.crosshair(false);
    this.ui.setSub("");
    this.endKillcam();
    gameplayStop();
    this.stopSyncRetry();
    this.stopFireResend();
    this.stopHeartbeat();
    this.stopHelloRetry();
    this.clearIntroTimers();
    this.clearSyncDeadline();
    if (this.helloTimer) {
      clearTimeout(this.helloTimer);
      this.helloTimer = null;
    }
    if (this.bgTimer !== null) {
      clearInterval(this.bgTimer);
      this.bgTimer = null;
    }
    const overlay = document.getElementById("cine-overlay");
    if (overlay !== null) {
      overlay.classList.add("hidden");
    }
    if (this.playerBody !== null) {
      this.playerBody.setWalk(false);
      this.playerBody.group.visible = false;
    }
    for (const entry of this.listeners) {
      entry[0].removeEventListener(entry[1], entry[2]);
    }
    this.listeners = [];
    if (this.net !== null) {
      this.net.leave();
    }
    if (document.pointerLockElement !== null) {
      document.exitPointerLock();
    }
    this.ui.hudVisible(false);
    this.ui.setBig("", null, 0);
    this.ui.setSub("");
  }
}
