import * as THREE from "three";
import { createRng, roundSeed, rangeFrom } from "./rng.js";
import { pickModifier, pickDistance } from "./modifiers.js";
import { PERKS, perkById, pickPerkOptions } from "./perks.js";
import { AI_USABLE_PERKS } from "./ai.js";
import { t } from "./i18n.js";
import { skinById } from "./skins.js";
import { gameplayStart, gameplayStop, happyTime } from "./sdk.js";

const WIN_SCORE = 3;
const BASE_RELOAD = 1300;
const FAST_RELOAD = 780;
const COCK_DELAY = 550;
const DODGE_DURATION = 750;
const DODGE_RECOVERY = 350;
const SPURS_RECOVERY = 120;
const ROUND_TIMEOUT = 12000;
const SWAY_BASE = 0.028;
const DODGE_SWAY = 0.05;
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
    this.ranked = false;
    if (deps.ranked) {
      this.ranked = true;
    }
    this.myProfile = null;
    if (deps.profile) {
      this.myProfile = deps.profile;
    }
    this.onResult = deps.onResult;
    this.oppElo = 1000;
    this.opponentName = t("theOpponent");
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
    this.kickX = 0;
    this.kickY = 0;
    this.drawWobbleUntil = 0;
    this.glare = 0;
    this.dodgeSwayAmount = 0;
    this.locked = false;
    this.syncRetry = null;
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
    this.lastModifierId = null;
    this.resultReported = false;
  }

  reportResult(won) {
    if (this.resultReported) {
      return;
    }
    this.resultReported = true;
    if (this.onResult) {
      this.onResult(won, this.oppElo);
    }
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
          if (self.state === "prelock") {
            self.startIntro();
          }
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
      if (this.myProfile !== null) {
        this.net.send("hello", {
          pseudo: this.myProfile.pseudo,
          skin: this.myProfile.skin,
          elo: this.myProfile.elo
        });
      }
    } else {
      this.net = null;
    }

    gameplayStart();
    this.beginRoundSync();
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
      this.ui.setBig("", null, 0);
      this.ui.setSub(t("waitingOpp"));
      this.net.send("ready", { round: this.roundIndex });
      this.readySent = true;
      this.stopSyncRetry();
      const self = this;
      this.syncRetry = setInterval(function () {
        if (self.state === "sync" && !self.disposed) {
          self.net.send("ready", { round: self.roundIndex });
        } else {
          self.stopSyncRetry();
        }
      }, 900);
      this.checkSync();
    } else {
      this.beginRound();
    }
  }

  stopSyncRetry() {
    if (this.syncRetry) {
      clearInterval(this.syncRetry);
      this.syncRetry = null;
    }
  }

  checkSync() {
    if (this.state === "sync" && this.oppReadyRound >= this.roundIndex) {
      this.stopSyncRetry();
      this.beginRound();
    }
  }

  beginRound() {
    const rng = createRng(roundSeed(this.matchSeed, this.roundIndex));
    const modifier = pickModifier(rng, this.roundIndex, this.lastModifierId);
    this.lastModifierId = modifier.id;
    const distance = pickDistance(rng, this.roundIndex);
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
      dodgeStart: -1,
      dodgeDir: 0,
      playerDodgeUntil: 0,
      playerBusyUntil: 0,
      dodgeCooldownUntil: 0,
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

    this.arena.applyModifier(modifier, distance.meters);
    this.cowboy.reset();
    this.viewmodel.holster();
    this.aimYaw = 0;
    this.aimPitch = -0.04;
    this.glare = 0;
    this.drawWobbleUntil = 0;
    this.kickX = 0;
    this.kickY = 0;
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

    if (!this.isTouch && !this.locked && this.net === null) {
      this.state = "prelock";
      this.ui.showScreen("lock-prompt");
    } else {
      this.startIntro();
    }
  }

  startIntro() {
    this.audio.reveal();
    this.ui.setBig(t(this.round.modifier.nameKey), "gold", 3400);
    this.ui.setSub(t(this.round.modifier.descKey));
    this.state = "intro";
    this.introUntil = performance.now() + 3600;
  }

  fireSignal(now) {
    this.state = "active";
    this.round.signalTime = now;
    this.audio.bell();
    this.ui.setBig(t("fire"), "fire", 1300);
    this.ui.setSub("");
    this.ui.crosshair(true);
    this.viewmodel.draw();
    this.kickX = (Math.random() - 0.5) * 0.16;
    this.kickY = 0.09 + Math.random() * 0.07;
    if (this.playerPerks.has("draw")) {
      this.kickX *= 0.5;
      this.kickY *= 0.5;
    }
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
    if (this.state === "waiting" || this.state === "intro") {
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
    const shotT = Math.round(this.tSignal(now));
    if (this.round.playerFirstShotT === null) {
      this.round.playerFirstShotT = shotT;
      if (this.bestReaction === null || shotT < this.bestReaction) {
        this.bestReaction = shotT;
      }
    }
    this.viewmodel.shoot();
    this.audio.gunshot();
    this.shake = 1;

    const part = this.castShot();

    if (this.net !== null) {
      this.net.send("shot", { t: shotT, part: part });
      if (part === "hat") {
        this.cowboy.playHatShot(this.arena.scene);
        this.audio.ricochet();
        this.ui.setSub(t("hatOff"));
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
      this.ui.setSub(t("missed"));
      this.startReload(now, this.reloadDuration());
      this.ai.onPlayerMiss(shotT);
    } else if (part === "hat") {
      this.cowboy.playHatShot(this.arena.scene);
      this.audio.ricochet();
      this.ui.setSub(t("hatOff"));
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
        this.ui.setSub(t("hitSub"));
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
      this.ui.setGunState(t("reloading"));
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
    if (now < this.round.dodgeCooldownUntil) {
      return;
    }
    if (this.round.playerDodges <= 0) {
      return;
    }
    const dodgeT = Math.round(this.tSignal(now));
    this.round.playerDodges -= 1;
    this.ui.setDodges(this.round.playerDodges);
    this.round.dodgeStart = now;
    this.round.dodgeDir = dir;
    this.round.playerDodgeUntil = now + DODGE_DURATION;
    this.round.dodgeCooldownUntil = now + DODGE_DURATION + this.dodgeRecovery();
    this.round.dodgeWindows.push([dodgeT - 40, dodgeT + DODGE_DURATION]);
    this.audio.whoosh();
    if (this.net !== null) {
      this.net.send("dodge", { t: dodgeT, dir: dir });
    } else {
      this.ai.onPlayerDodge(dodgeT);
    }
  }

  playerMisfire() {
    if (this.round === null || this.round.resolved) {
      return;
    }
    this.viewmodel.draw();
    this.viewmodel.shoot();
    this.audio.gunshot();
    this.ui.setBig(t("earlyDraw"), "fire", 1900);
    this.ui.setSub(t("earlyDrawSub"));
    this.round.resolved = true;
    if (this.net !== null) {
      this.net.send("misfire", {});
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
    this.cowboy.playDeath(this.arena.scene);
    this.audio.thud();
    this.ui.setBig(t("down"), "gold", 2100);
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
    this.ui.setBig(t("youFell"), "fire", 2100);
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
        reason = t("reasonBothYou");
      } else if (r.oppDeathShotT !== null && r.myKillerT !== null && r.myKillerT < r.oppDeathShotT) {
        winner = "opp";
        reason = t("reasonBothOpp");
      } else {
        winner = null;
        reason = t("reasonBothNone");
      }
    } else if (r.oppDead) {
      winner = "you";
      reason = t("reasonOppDown");
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
    if (this.state === "ended" || this.state === "matchend") {
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
      times += "<span>" + t("yourShot") + " : <strong>" + this.round.playerFirstShotT + " ms</strong></span>";
    }
    if (this.round.oppShotT !== null) {
      times += "<span>" + t("oppShot") + " : <strong>" + this.round.oppShotT + " ms</strong></span>";
    }

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
    this.ui.roundEnd(title, reason, times, function () {
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
    const score = this.scoreYou + " - " + this.scoreOpp;
    let title = t("defeat");
    let detail = t("defeatDetail", { name: this.opponentName, score: score });
    const won = this.scoreYou > this.scoreOpp;
    if (won) {
      title = t("victory");
      detail = t("victoryDetail", { score: score });
      this.audio.victory();
      happyTime();
    } else {
      this.audio.defeat();
    }
    if (this.bestReaction !== null) {
      detail += t("bestReflex", { ms: this.bestReaction });
    }
    gameplayStop();
    this.reportResult(won);
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
      gameplayStart();
      this.beginRoundSync();
      return;
    }
    this.rematchAsked = true;
    this.net.send("rematch", {});
    this.ui.matchEnd(t("waitingTitle"), t("waitingRematch"), function () {}, this.exit.bind(this));
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
    if (type === "hello") {
      this.opponentName = String(payload.pseudo).toUpperCase();
      this.oppElo = 1000;
      if (Number.isFinite(payload.elo)) {
        this.oppElo = payload.elo;
      }
      this.cowboy.setSkin(skinById(payload.skin).colors);
    } else if (type === "ready") {
      this.oppReadyRound = Math.max(this.oppReadyRound, payload.round);
      this.checkSync();
    } else if (type === "misfire") {
      if (this.state === "waiting" || this.state === "active" || this.state === "intro" || this.state === "prelock") {
        this.round.resolved = true;
        this.cowboy.playDraw();
        this.cowboy.playShoot();
        this.audio.distantShot();
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
      this.ui.setSub(t("dodgedSub"));
    } else if (type === "wounded") {
      this.cowboy.playFlinch();
      this.cowboy.setWounded();
      this.ui.setSub(t("hitSub"));
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
      this.audio.ricochet();
      return;
    }
    if (payload.part === "hat") {
      this.audio.ricochet();
      this.ui.setSub(t("hatLost"));
      return;
    }
    if (this.round.playerDead || this.round.resolved) {
      return;
    }
    for (const window of this.round.dodgeWindows) {
      if (payload.t >= window[0] && payload.t <= window[1]) {
        this.net.send("dodged", { t: payload.t });
        this.ui.setSub(t("youDodged"));
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
      this.ui.setSub(t("hitArm"));
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
      this.ui.setSub(t("youDodged"));
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
      this.ui.setSub(t("hitArm"));
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
    this.ui.matchEnd(t("fled"), t("fledDetail"), function () {
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
      if (!this.isTouch && !this.locked && this.net === null) {
        this.introUntil += dt * 1000;
      } else if (now >= this.introUntil) {
        this.state = "waiting";
        this.waitStart = now;
        this.ui.setSub(t("waitSignal"));
      }
    } else if (this.state === "waiting") {
      if (!this.isTouch && !this.locked && this.net === null) {
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
    const sunny = modifier.id !== "dusk" && modifier.id !== "fog";
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
        this.ui.setGlarePos((0.5 + sunPos.x / 2) * 100, (0.5 - sunPos.y / 2) * 100);
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
      amp *= 0.55;
    }
    if (this.round !== null && this.round.modifier.sway > 0) {
      amp *= 2.2;
    }
    let dodgeSwayTarget = 0;
    if (this.round !== null && now < this.round.playerDodgeUntil) {
      dodgeSwayTarget = DODGE_SWAY;
    }
    this.dodgeSwayAmount += (dodgeSwayTarget - this.dodgeSwayAmount) * Math.min(1, dt * 6);
    amp += this.dodgeSwayAmount;
    let kickFactor = 0;
    if (now < this.drawWobbleUntil) {
      kickFactor = (this.drawWobbleUntil - now) / DRAW_WOBBLE_MS;
      let wobble = DRAW_WOBBLE_AMP;
      if (this.playerPerks.has("draw")) {
        wobble *= 0.5;
      }
      amp += kickFactor * wobble;
    }
    const time = now / 1000;
    this.swayX = (Math.sin(time * 1.15) + Math.sin(time * 2.4 + 1.7) * 0.6) * amp;
    this.swayY = (Math.cos(time * 1.75) + Math.sin(time * 2.9 + 0.5) * 0.5) * amp * 0.75;
    this.swayX += this.kickX * kickFactor;
    this.swayY += this.kickY * kickFactor;
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
    this.reportResult(false);
    this.dispose();
    this.onExit();
  }

  dispose() {
    this.disposed = true;
    gameplayStop();
    this.stopSyncRetry();
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
