import * as THREE from "three";
import { createRng, roundSeed, rangeFrom } from "./rng.js";
import { pickModifier } from "./modifiers.js";
import { PERKS, perkById } from "./perks.js";

const WIN_SCORE = 3;
const MAX_HP = 2;
const BASE_RELOAD = 1300;
const FAST_RELOAD = 780;
const COCK_DELAY = 550;
const DODGE_DURATION = 750;
const DODGE_RECOVERY = 350;
const ROUND_TIMEOUT = 12000;
const SWAY_BASE = 0.016;
const DRAW_WOBBLE_MS = 700;
const DRAW_WOBBLE_AMP = 0.055;

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
    this.opponentName = "L'ADVERSAIRE";
    if (this.mode === "ai") {
      this.opponentName = this.ai.name.toUpperCase();
    }
    this.disposed = false;
    this.listeners = [];
    this.aimYaw = 0;
    this.aimPitch = -0.04;
    this.shake = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.drawWobbleUntil = 0;
    this.glare = 0;
    this.locked = false;
    this.oppReadyRound = -1;
    this.oppRematch = false;
    this.rematchAsked = false;
    this.resetMatch();
  }

  resetMatch() {
    this.scoreYou = 0;
    this.scoreOpp = 0;
    this.roundIndex = 0;
    this.playerPerks = new Set();
    this.oppPerkIds = new Set();
    this.bestReaction = null;
    this.state = "idle";
    this.round = null;
  }

  addListener(target, type, handler) {
    target.addEventListener(type, handler);
    this.listeners.push([target, type, handler]);
  }

  start() {
    const self = this;
    this.ui.hideScreens();
    this.ui.hudVisible(true);
    this.ui.setScore(0, 0);
    this.ui.touchControls(this.isTouch);

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
    this.addListener(document, "keydown", function (e) {
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
          self.ui.showScreen(null);
        } else if (!self.disposed && self.stateNeedsLock()) {
          self.ui.showScreen("lock-prompt");
        }
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
      this.ui.showScreen("lock-prompt");
    }

    if (this.net !== null && this.net !== undefined) {
      this.net.onEvent(function (type, payload) {
        self.onRemote(type, payload);
      });
      this.net.onLeft(function () {
        self.onOpponentLeft();
      });
    } else {
      this.net = null;
    }

    this.beginRoundSync();
  }

  stateNeedsLock() {
    return this.state === "intro" || this.state === "waiting" || this.state === "active" || this.state === "sync";
  }

  applyAim(dx, dy, sens) {
    if (this.state !== "active" && this.state !== "waiting") {
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
      return 2;
    }
    return 1;
  }

  beginRoundSync() {
    if (this.net !== null) {
      this.state = "sync";
      this.ui.setBig("", null, 0);
      this.ui.setSub("En attente de l'adversaire…");
      this.net.send("ready", { round: this.roundIndex });
      this.readySent = true;
      this.checkSync();
    } else {
      this.beginRound();
    }
  }

  checkSync() {
    if (this.state === "sync" && this.oppReadyRound >= this.roundIndex) {
      this.beginRound();
    }
  }

  beginRound() {
    const rng = createRng(roundSeed(this.matchSeed, this.roundIndex));
    const modifier = pickModifier(rng, this.roundIndex);
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

    this.round = {
      modifier: modifier,
      signalDelay: signalDelay,
      distractions: distractions,
      signalTime: 0,
      playerHp: MAX_HP,
      oppHp: MAX_HP,
      playerDodges: this.dodgesPerRound(),
      dodgeStart: -1,
      dodgeDir: 0,
      playerDodgeUntil: 0,
      playerBusyUntil: 0,
      dodgeWindows: [],
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

    this.arena.applyModifier(modifier);
    this.cowboy.reset();
    this.viewmodel.holster();
    this.aimYaw = 0;
    this.aimPitch = -0.04;
    this.glare = 0;
    this.drawWobbleUntil = 0;
    this.ui.setGlare(0);

    this.ui.setRoundLabel("MANCHE " + (this.roundIndex + 1) + " · " + modifier.name);
    this.ui.setHearts(this.round.playerHp);
    this.ui.setDodges(this.round.playerDodges);
    this.ui.setGunState("");
    this.ui.crosshair(false);
    this.ui.setBig(modifier.name, "gold", 1700);
    this.ui.setSub(modifier.desc);

    if (this.ai !== null && this.ai !== undefined) {
      this.ai.startRound({
        signalDelay: signalDelay,
        modifier: modifier,
        roundIndex: this.roundIndex
      });
    }

    this.state = "intro";
    this.introUntil = performance.now() + 1900;
  }

  fireSignal(now) {
    this.state = "active";
    this.round.signalTime = now;
    this.audio.bell();
    this.ui.setBig("FEU !", "fire", 900);
    this.ui.setSub("");
    this.ui.crosshair(true);
    this.viewmodel.draw();
    this.aimPitch += 0.08 + Math.random() * 0.09;
    this.aimYaw += (Math.random() - 0.5) * 0.18;
    this.aimYaw = Math.max(-0.8, Math.min(0.8, this.aimYaw));
    this.aimPitch = Math.max(-0.5, Math.min(0.45, this.aimPitch));
    this.drawWobbleUntil = now + DRAW_WOBBLE_MS;
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
    if (this.state === "waiting") {
      this.playerMisfire();
      return;
    }
    if (this.state !== "active") {
      return;
    }
    if (this.round.playerDead || this.round.resolved) {
      return;
    }
    if (now < this.round.playerBusyUntil) {
      this.audio.dryClick();
      return;
    }
    const t = Math.round(this.tSignal(now));
    if (this.round.playerFirstShotT === null) {
      this.round.playerFirstShotT = t;
      if (this.bestReaction === null || t < this.bestReaction) {
        this.bestReaction = t;
      }
    }
    this.viewmodel.shoot();
    this.audio.gunshot();
    this.shake = 1;

    const part = this.castShot();

    if (this.net !== null) {
      this.net.send("shot", { t: t, part: part });
      if (part === "hat") {
        this.cowboy.playHatShot(this.arena.scene);
        this.audio.ricochet();
        this.ui.setSub("Tu lui as fait voler le chapeau !");
        this.startReload(now, this.reloadDuration());
      } else if (part === null) {
        this.startReload(now, this.reloadDuration());
      } else {
        this.startReload(now, COCK_DELAY);
        this.ui.setGunState("");
      }
      return;
    }

    if (part === null) {
      this.ui.setSub("Raté !");
      this.startReload(now, this.reloadDuration());
      this.ai.onPlayerMiss(t);
    } else if (part === "hat") {
      this.cowboy.playHatShot(this.arena.scene);
      this.audio.ricochet();
      this.ui.setSub("Tu lui as fait voler le chapeau !");
      this.startReload(now, this.reloadDuration());
      this.ai.onPlayerMiss(t);
    } else if (part === "head") {
      this.opponentDies(t);
    } else {
      this.round.oppHp -= 1;
      if (this.round.oppHp <= 0) {
        this.opponentDies(t);
      } else {
        this.cowboy.playFlinch();
        this.cowboy.setWounded();
        this.ai.notifyWounded();
        this.ui.setSub("Touché !");
        this.startReload(now, COCK_DELAY);
      }
    }
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
    if (duration > COCK_DELAY) {
      this.ui.setGunState("RECHARGEMENT…");
    }
  }

  onDodge(dir) {
    const now = performance.now();
    if (this.state !== "active") {
      return;
    }
    if (this.round.playerDead || this.round.resolved) {
      return;
    }
    if (now < this.round.playerBusyUntil) {
      return;
    }
    if (this.round.playerDodges <= 0) {
      return;
    }
    const t = Math.round(this.tSignal(now));
    this.round.playerDodges -= 1;
    this.ui.setDodges(this.round.playerDodges);
    this.round.dodgeStart = now;
    this.round.dodgeDir = dir;
    this.round.playerDodgeUntil = now + DODGE_DURATION;
    this.round.playerBusyUntil = now + DODGE_DURATION + DODGE_RECOVERY;
    this.round.dodgeWindows.push([t - 40, t + DODGE_DURATION]);
    this.audio.whoosh();
    if (this.net !== null) {
      this.net.send("dodge", { t: t, dir: dir });
    } else {
      this.ai.onPlayerDodge(t);
    }
  }

  playerMisfire() {
    this.viewmodel.draw();
    this.viewmodel.shoot();
    this.audio.gunshot();
    this.ui.setBig("TIR ANTICIPÉ !", "fire", 1400);
    this.ui.setSub("Tu as dégainé avant le signal…");
    this.round.resolved = true;
    if (this.net !== null) {
      this.net.send("misfire", {});
    } else {
      this.ai.stop();
    }
    const self = this;
    setTimeout(function () {
      self.endRound("opp", "Tir anticipé. La manche revient à " + self.opponentName + ".");
    }, 1500);
  }

  opponentDies(shotT) {
    if (this.round.oppDead) {
      return;
    }
    this.round.oppDead = true;
    this.round.oppDeathShotT = shotT;
    this.cowboy.playDeath(this.arena.scene);
    this.audio.thud();
    this.ui.setBig("À TERRE !", "gold", 1600);
    if (this.ai !== null && this.ai !== undefined) {
      this.ai.stop();
    }
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
    this.ui.setBig("TU ES TOMBÉ", "fire", 1600);
    this.ui.crosshair(false);
    if (this.net !== null) {
      this.net.send("death", { shotT: killerShotT });
    } else {
      this.ai.stop();
    }
    this.scheduleResolve();
  }

  scheduleResolve() {
    if (this.round.resolveAt === null) {
      this.round.resolveAt = performance.now() + 1500;
    }
    this.round.resolved = true;
  }

  finalizeRound() {
    const r = this.round;
    let winner = null;
    let reason = "";
    if (r.oppDead && r.playerDead) {
      if (r.oppDeathShotT !== null && r.myKillerT !== null && r.oppDeathShotT < r.myKillerT) {
        winner = "you";
        reason = "Les deux sont tombés, mais ta balle est partie la première.";
      } else if (r.oppDeathShotT !== null && r.myKillerT !== null && r.myKillerT < r.oppDeathShotT) {
        winner = "opp";
        reason = "Les deux sont tombés, la balle adverse est partie la première.";
      } else {
        winner = null;
        reason = "Personne ne se relève. Manche nulle.";
      }
    } else if (r.oppDead) {
      winner = "you";
      reason = "Adversaire au tapis.";
    } else if (r.playerDead) {
      winner = "opp";
      reason = "Tu mords la poussière.";
    } else {
      winner = null;
      reason = "Personne n'est tombé. On remet ça.";
    }
    this.endRound(winner, reason);
  }

  endRound(winner, reason) {
    if (this.state === "ended") {
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

    let times = "";
    if (this.round.playerFirstShotT !== null) {
      times += "<span>Ton premier tir : <strong>" + this.round.playerFirstShotT + " ms</strong></span>";
    }
    if (this.round.oppShotT !== null) {
      times += "<span>Tir adverse : <strong>" + this.round.oppShotT + " ms</strong></span>";
    }

    if (this.scoreYou >= WIN_SCORE || this.scoreOpp >= WIN_SCORE) {
      this.showMatchEnd();
      return;
    }

    let title = "MANCHE NULLE";
    if (winner === "you") {
      title = "MANCHE GAGNÉE";
    } else if (winner === "opp") {
      title = "MANCHE PERDUE";
    }

    const self = this;
    this.ui.roundEnd(title, reason, times, function () {
      self.afterRoundPanel(winner);
    });
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
  }

  afterRoundPanel(winner) {
    const self = this;
    if (winner === "opp") {
      const available = PERKS.filter(function (perk) {
        return !self.playerPerks.has(perk.id);
      });
      if (available.length > 0) {
        this.ui.perkChoice(available, function (id) {
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
        return !self.oppPerkIds.has(perk.id);
      });
      if (availableOpp.length > 0) {
        const id = this.ai.pickPerk(availableOpp);
        this.oppPerkIds.add(id);
        this.ai.perks.add(id);
        const perk = perkById(id);
        this.ui.setSub(this.opponentName + " choisit : " + perk.name);
        setTimeout(function () {
          self.ui.setSub("");
        }, 2200);
      }
    }
    this.nextRound();
  }

  nextRound() {
    this.roundIndex += 1;
    if (!this.isTouch && document.pointerLockElement === null) {
      this.ui.showScreen("lock-prompt");
    }
    this.beginRoundSync();
  }

  showMatchEnd() {
    const self = this;
    let title = "DÉFAITE…";
    let detail = this.opponentName + " repart au saloon. " + this.scoreYou + " - " + this.scoreOpp + ".";
    if (this.scoreYou > this.scoreOpp) {
      title = "VICTOIRE !";
      detail = "La ville est à toi. " + this.scoreYou + " - " + this.scoreOpp + ".";
      this.audio.victory();
    } else {
      this.audio.defeat();
    }
    if (this.bestReaction !== null) {
      detail += " Meilleur réflexe : " + this.bestReaction + " ms.";
    }
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
    this.state = "matchend";
    this.ui.matchEnd(title, detail, function () {
      self.requestRematch();
    }, function () {
      self.exit();
    });
  }

  requestRematch() {
    if (this.net === null) {
      this.matchSeed = (this.matchSeed + 1017) >>> 0;
      this.resetMatch();
      this.ui.setScore(0, 0);
      if (!this.isTouch) {
        this.ui.showScreen("lock-prompt");
      }
      this.beginRoundSync();
      return;
    }
    this.rematchAsked = true;
    this.net.send("rematch", {});
    this.ui.matchEnd("EN ATTENTE…", "On attend que l'adversaire accepte la revanche.", function () {}, this.exit.bind(this));
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
      this.beginRoundSync();
    }
  }

  onRemote(type, payload) {
    if (this.disposed) {
      return;
    }
    const now = performance.now();
    if (type === "ready") {
      this.oppReadyRound = Math.max(this.oppReadyRound, payload.round);
      this.checkSync();
    } else if (type === "misfire") {
      if (this.state === "waiting" || this.state === "active" || this.state === "intro") {
        this.round.resolved = true;
        this.cowboy.playDraw();
        this.cowboy.playShoot();
        this.audio.distantShot();
        this.ui.setBig("TIR ANTICIPÉ ADVERSE", "gold", 1500);
        const self = this;
        setTimeout(function () {
          self.endRound("you", self.opponentName + " a dégainé avant le signal.");
        }, 1500);
      }
    } else if (type === "dodge") {
      this.cowboy.playDodge(payload.dir);
    } else if (type === "shot") {
      this.handleRemoteShot(payload, now);
    } else if (type === "dodged") {
      this.ui.setSub("Esquivé !");
    } else if (type === "wounded") {
      this.cowboy.playFlinch();
      this.cowboy.setWounded();
      this.ui.setSub("Touché !");
    } else if (type === "death") {
      this.opponentDies(payload.shotT);
    } else if (type === "perk") {
      const perk = perkById(payload.id);
      if (perk !== null) {
        this.oppPerkIds.add(perk.id);
        this.ui.setSub(this.opponentName + " choisit : " + perk.name);
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
      this.audio.ricochet();
      return;
    }
    if (payload.part === "hat") {
      this.audio.ricochet();
      this.ui.setSub("Il t'a fait voler le chapeau !");
      return;
    }
    if (this.round.playerDead || this.round.resolved) {
      return;
    }
    for (const window of this.round.dodgeWindows) {
      if (payload.t >= window[0] && payload.t <= window[1]) {
        this.net.send("dodged", { t: payload.t });
        this.ui.setSub("Tu l'as esquivée !");
        this.audio.ricochet();
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
      this.ui.setSub("Touché au bras !");
    }
  }

  handleAiEvents(now) {
    if (this.ai === null || this.ai === undefined) {
      return;
    }
    const t = this.tSignal(now);
    const events = this.ai.update(t);
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
    this.ui.setBig("TIR ANTICIPÉ ADVERSE", "gold", 1500);
    this.ai.stop();
    const self = this;
    setTimeout(function () {
      self.endRound("you", self.opponentName + " a dégainé avant le signal. La manche est pour toi.");
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
      this.ui.setSub("Tu l'as esquivée !");
      this.audio.ricochet();
      if (evt.result !== "miss") {
        this.ai.onShotDodged(this.tSignal(now));
      }
      return;
    }
    if (evt.result === "miss") {
      this.audio.ricochet();
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
      this.ui.setSub("Touché au bras !");
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
    const self = this;
    if (document.pointerLockElement !== null && !this.isTouch) {
      document.exitPointerLock();
    }
    this.ui.matchEnd("FUITE !", "L'adversaire a quitté la ville. Victoire par forfait.", function () {
      self.exit();
    }, function () {
      self.exit();
    });
  }

  update(now, dt) {
    if (this.disposed) {
      return;
    }

    if (this.state === "intro") {
      if (!this.isTouch && !this.locked) {
        this.introUntil += dt * 1000;
      } else if (now >= this.introUntil) {
        this.state = "waiting";
        this.waitStart = now;
        this.ui.setSub("Attends le signal…");
      }
    } else if (this.state === "waiting") {
      if (!this.isTouch && !this.locked) {
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
      if (!this.round.resolved && waited >= this.round.signalDelay) {
        this.fireSignal(now);
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

    this.updateGlare(now, dt);
    this.updateCamera(now, dt);
  }

  updateGlare(now, dt) {
    if (this.round === null) {
      return;
    }
    const sunny = this.round.modifier.id !== "dusk" && this.round.modifier.id !== "fog";
    if (this.state === "waiting" && sunny && !this.round.resolved && this.aimPitch > -0.15) {
      this.glare = Math.min(1, this.glare + dt / 1.1);
    } else {
      this.glare = Math.max(0, this.glare - dt / 0.7);
    }
    this.ui.setGlare(this.glare);
  }

  updateCamera(now, dt) {
    const camera = this.arena.camera;
    const rig = this.arena.playerRig;

    let amp = SWAY_BASE;
    if (this.round !== null && this.round.modifier.sway > 0) {
      amp *= 2.6;
    }
    if (now < this.drawWobbleUntil) {
      amp += ((this.drawWobbleUntil - now) / DRAW_WOBBLE_MS) * DRAW_WOBBLE_AMP;
    }
    const t = now / 1000;
    this.swayX = (Math.sin(t * 1.15) + Math.sin(t * 2.4 + 1.7) * 0.6) * amp;
    this.swayY = (Math.cos(t * 1.75) + Math.sin(t * 2.9 + 0.5) * 0.5) * amp * 0.75;
    this.ui.moveCrosshair(this.swayX, this.swayY);

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
    if (this.round !== null && this.round.dodgeStart > 0) {
      const elapsed = now - this.round.dodgeStart;
      const total = DODGE_DURATION + DODGE_RECOVERY;
      if (elapsed < total) {
        const phase = elapsed / total;
        targetX = Math.sin(phase * Math.PI) * 1.3 * this.round.dodgeDir;
      } else {
        this.round.dodgeStart = -1;
      }
    }
    rig.position.x += (targetX - rig.position.x) * Math.min(1, dt * 12);

    if (this.round !== null && this.round.playerDead) {
      this.round.deathAnimT = Math.min(1, this.round.deathAnimT + dt * 1.4);
      const e = this.round.deathAnimT * this.round.deathAnimT;
      rig.position.y = 1.6 - e * 1.1;
      camera.rotation.z = e * 0.6;
    } else {
      rig.position.y = 1.6;
      camera.rotation.z = 0;
    }
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
