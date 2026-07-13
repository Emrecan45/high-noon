import * as THREE from "three";
import { createCowboy } from "./cowboy.js";
import { weaponById } from "./weapons.js";
import { MODIFIERS } from "./modifiers.js";
import { t } from "./i18n.js";

const WALK_SPEED = 1.5;
const CHARS_PER_SEC = 44;

function el(id) {
  return document.getElementById(id);
}

export class Cinematic {
  constructor(deps) {
    this.arena = deps.arena;
    this.audio = deps.audio;
    this.music = deps.music || null;
    this.steps = deps.steps;
    this.onDone = deps.onDone;
    this.onQuit = deps.onQuit;
    this.actorsSpec = deps.actors || {};
    this.bodies = {};
    this.walks = [];
    this.index = -1;
    this.stepT = 0;
    this.stepDur = 0;
    this.paused = false;
    this.disposed = false;
    this.finished = false;
    this.typing = null;
    this.waitingClick = false;
    this.talker = null;
    this.camTween = null;
    this.stepClock = 0;
    this.listeners = [];
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.fromPos = new THREE.Vector3();
    this.fromLook = new THREE.Vector3();
    this.fov = 70;
    this.fromFov = 70;
    this.toFov = 70;
  }

  addListener(target, type, handler) {
    target.addEventListener(type, handler);
    this.listeners.push([target, type, handler]);
  }

  resolve(p) {
    if (Array.isArray(p)) {
      return new THREE.Vector3(p[0], p[1], p[2]);
    }
    const set = this.arena.interiors.sets[p.set];
    return new THREE.Vector3(
      set.origin.x + p.at[0],
      p.at[1],
      set.origin.z + p.at[2]
    );
  }

  start() {
    const self = this;
    for (const name of Object.keys(this.actorsSpec)) {
      const spec = this.actorsSpec[name];
      const body = createCowboy();
      body.setSkin(spec.colors);
      body.setAccessories(spec.acc || []);
      body.setWeapon(weaponById(spec.weapon || "iron").colors);
      body.group.visible = false;
      this.arena.scene.add(body.group);
      this.bodies[name] = body;
    }
    el("story-cine").classList.remove("hidden");
    el("cine-say").classList.add("hidden");
    el("cine-pause").classList.add("hidden");
    this.addListener(el("story-cine"), "pointerdown", function (e) {
      if (e.target.closest("#cine-pause")) {
        return;
      }
      self.onAdvanceClick();
    });
    this.addListener(document, "keydown", function (e) {
      if (self.disposed) {
        return;
      }
      if (e.code === "Escape") {
        if (self.paused) {
          self.resume();
        } else {
          self.pause();
        }
      } else if (e.code === "Space" || e.code === "Enter") {
        if (!self.paused) {
          self.onAdvanceClick();
        }
      }
    });
    this.addListener(el("btn-cine-continue"), "click", function () {
      self.resume();
    });
    this.addListener(el("btn-cine-quit"), "click", function () {
      self.quit();
    });
    for (const step of this.steps) {
      if (step.cut !== undefined) {
        this.camPos.copy(this.resolve(step.cut.pos));
        this.camLook.copy(this.resolve(step.cut.look));
        if (step.cut.fov !== undefined) {
          this.fov = step.cut.fov;
        }
        break;
      }
      if (step.cam !== undefined) {
        this.camPos.copy(this.resolve(step.cam.pos));
        this.camLook.copy(this.resolve(step.cam.look));
        if (step.cam.fov !== undefined) {
          this.fov = step.cam.fov;
        }
        break;
      }
    }
    const fade = el("fade-overlay");
    fade.style.transition = "none";
    fade.style.opacity = "1";
    this.applyCamera();
    this.nextStep();
  }

  applyCamera() {
    this.arena.playerRig.position.copy(this.camPos);
    this.arena.camera.position.set(0, 0, 0);
    this.arena.camera.lookAt(this.camLook);
    if (Math.abs(this.arena.camera.fov - this.fov) > 0.01) {
      this.arena.camera.fov = this.fov;
      this.arena.camera.updateProjectionMatrix();
    }
  }

  body(name) {
    return this.bodies[name];
  }

  seatY(mode) {
    return mode === "floor" ? -0.72 : -0.34;
  }

  faceActor(name, target) {
    const body = this.body(name);
    let v;
    if (typeof target === "string") {
      v = this.body(target).group.position;
    } else {
      v = this.resolve(target);
    }
    const pos = body.group.position;
    body.group.rotation.y = Math.atan2(v.x - pos.x, v.z - pos.z);
  }

  setFade(target, dur) {
    const overlay = el("fade-overlay");
    overlay.style.transition = "opacity " + dur + "s";
    overlay.style.opacity = target;
  }

  applyStep(step) {
    const self = this;
    this.stepT = 0;
    this.stepDur = step.dur !== undefined ? step.dur : (step.say !== undefined ? 0 : 0.01);
    if (step.show !== undefined) {
      this.arena.interiors.show(step.show);
    }
    if (step.hideSet) {
      this.arena.interiors.hideAll();
    }
    if (step.mod !== undefined) {
      const found = MODIFIERS.filter(function (m) { return m.id === step.mod; });
      if (found.length > 0) {
        this.arena.applyModifier(found[0], 19);
      }
    }
    if (step.cut !== undefined) {
      this.camTween = null;
      this.camPos.copy(this.resolve(step.cut.pos));
      this.camLook.copy(this.resolve(step.cut.look));
      if (step.cut.fov !== undefined) {
        this.fov = step.cut.fov;
      }
      this.applyCamera();
    }
    if (step.cam !== undefined) {
      this.fromPos.copy(this.camPos);
      this.fromLook.copy(this.camLook);
      this.fromFov = this.fov;
      this.toFov = step.cam.fov !== undefined ? step.cam.fov : this.fov;
      this.stepClock = 0;
      this.camTween = {
        pos: this.resolve(step.cam.pos),
        look: this.resolve(step.cam.look),
        dur: step.dur || 1,
        ease: step.cam.ease || "inout"
      };
    }
    if (step.place !== undefined) {
      for (const p of [].concat(step.place)) {
        const body = this.body(p.actor);
        const v = this.resolve(p.at);
          body.group.position.set(v.x, p.y !== undefined ? p.y : 0, v.z);
          this.walks = this.walks.filter(function(task) { return task.actor !== p.actor; });
          if (p.ry !== undefined) {
          body.group.rotation.y = p.ry;
        }
        if (p.seated) {
          body.setSeated(p.seated);
          body.group.position.y = this.seatY(p.seated);
        }
        if (p.dig !== undefined) {
          body.setDig(p.dig);
        }
        body.group.visible = p.hidden !== true;
      }
      for (const p of [].concat(step.place)) {
        if (p.face !== undefined) {
          this.faceActor(p.actor, p.face);
        }
      }
    }
    if (step.pose !== undefined) {
      for (const p of [].concat(step.pose)) {
        const body = this.body(p.actor);
        if (p.seated !== undefined) {
          body.setSeated(p.seated);
          body.group.position.y = p.seated ? this.seatY(p.seated) : 0;
        }
        if (p.dig !== undefined) {
          body.setDig(p.dig);
        }
        if (p.draw === true) {
          body.playDraw();
        }
        if (p.holster === true) {
          body.playHolster();
        }
        if (p.dead === true) {
          body.playDeath(this.arena.scene, p.rest);
        }
        if (p.flinch === true) {
          body.playFlinch();
        }
        if (p.shoot === true) {
          body.playShoot();
        }
        if (p.wounded === true) {
          body.setWounded();
        }
        if (p.hidden !== undefined) {
          body.group.visible = !p.hidden;
        }
        if (p.ry !== undefined) {
          body.group.rotation.y = p.ry;
        }
        if (p.face !== undefined) {
          this.faceActor(p.actor, p.face);
        }
      }
    }
    if (step.walk !== undefined) {
      for (const w of [].concat(step.walk)) {
        const body = this.body(w.actor);
        const to = this.resolve(w.to);
        body.setSeated(false);
        body.group.position.y = 0;
        body.setWalk(true);
        this.walks = this.walks.filter(function (task) {
          return task.actor !== w.actor;
        });
        this.walks.push({
          actor: w.actor,
          body: body,
          to: to,
          speed: w.speed || WALK_SPEED,
          endRy: w.endRy,
          endFace: w.endFace
        });
      }
    }
    if (step.fade !== undefined) {
      this.setFade(step.fade === "out" ? "1" : "0", Math.max(0.15, step.dur || 0.4));
    }
    if (step.sfx !== undefined) {
      for (const name of [].concat(step.sfx)) {
        if (typeof this.audio[name] === "function") {
          this.audio[name]();
        }
      }
    }
    if (step.music !== undefined && this.music !== null) {
      this.music.setMode(step.music);
    }
    if (step.doors !== undefined && this.arena.interiors.setSaloonDoors !== undefined) {
      if (step.doors === "open") this.arena.interiors.setSaloonDoors(true);
      else if (step.doors === "close") this.arena.interiors.setSaloonDoors(false);
      else if (step.doors === true) {
        this.arena.interiors.setSaloonDoors(false); 
      }
    }
    if (step.call !== undefined) {
      step.call();
    }
    if (step.say !== undefined) {
      this.beginSay(step.say);
    }
  }

  beginSay(say) {
    const box = el("cine-say");
    box.classList.remove("hidden");
    const nameEl = el('cine-say-name');
    let nameStr;
    if (say.name !== undefined && say.name !== "") {
      nameStr = say.name;
    } else if (say.actor && this.actorsSpec[say.actor] && this.actorsSpec[say.actor].name) {
      nameStr = this.actorsSpec[say.actor].name;
    } else {
      nameStr = "?";
    }
    nameEl.style.display = "block";
    nameEl.textContent = nameStr;
    el("cine-say-text").textContent = "";
    el("cine-say-more").classList.add("hidden");
    if (this.talker !== null && this.bodies[this.talker]) {
      this.bodies[this.talker].setTalk(false);
    }
    this.talker = say.actor && this.bodies[say.actor] ? say.actor : null;
    if (this.talker !== null && say.silent !== true) {
      this.bodies[this.talker].setTalk(true);
    }
    this.typing = { full: t(say.key), shown: 0 };
    this.waitingClick = false;
  }

  endSay() {
    if (this.talker !== null && this.bodies[this.talker]) {
      this.bodies[this.talker].setTalk(false);
      this.talker = null;
    }
    el("cine-say").classList.add("hidden");
    this.typing = null;
    this.waitingClick = false;
  }

  onAdvanceClick() {
    if (this.paused || this.disposed) {
      return;
    }
    if (this.typing !== null && this.typing.shown < this.typing.full.length) {
      this.typing.shown = this.typing.full.length;
      el("cine-say-text").textContent = this.typing.full;
      el("cine-say-more").classList.remove("hidden");
      this.waitingClick = true;
      return;
    }
    if (this.waitingClick) {
      this.endSay();
      this.nextStep();
    }
  }

  nextStep() {
    if (this.disposed) {
      return;
    }
    this.index += 1;
    if (this.index >= this.steps.length) {
      this.finish();
      return;
    }
    this.applyStep(this.steps[this.index]);
  }

  pause() {
    this.paused = true;
    el("cine-pause").classList.remove("hidden");
  }

  resume() {
    this.paused = false;
    el("cine-pause").classList.add("hidden");
  }

  quit() {
    const cb = this.onQuit;
    this.dispose();
    if (cb) {
      cb();
    }
  }

  finish() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    const cb = this.onDone;
    this.dispose();
    if (cb) {
      cb();
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const pair of this.listeners) {
      pair[0].removeEventListener(pair[1], pair[2]);
    }
    this.listeners = [];
    for (const name of Object.keys(this.bodies)) {
      this.arena.scene.remove(this.bodies[name].group);
    }
    this.bodies = {};
    el("story-cine").classList.add("hidden");
    el("cine-say").classList.add("hidden");
    el("cine-pause").classList.add("hidden");
    const overlay = el("fade-overlay");
    overlay.style.transition = "";
    overlay.style.opacity = "0";
    if (this.arena.camera.fov !== 70) {
      this.arena.camera.fov = 70;
      this.arena.camera.updateProjectionMatrix();
    }
  }

  update(dt) {
    if (this.disposed || this.paused) {
      return;
    }
    for (const name of Object.keys(this.bodies)) {
      this.bodies[name].update(dt);
    }
    for (let i = this.walks.length - 1; i >= 0; i--) {
      const task = this.walks[i];
      const pos = task.body.group.position;
      const dx = task.to.x - pos.x;
      const dz = task.to.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.06) {
        task.body.setWalk(false);
        if (task.endRy !== undefined) {
          task.body.group.rotation.y = task.endRy;
        }
        if (task.endFace !== undefined) {
          this.faceActor(task.actor, task.endFace);
        }
        this.walks.splice(i, 1);
        continue;
      }
      const move = Math.min(dist, task.speed * dt);
      pos.x += (dx / dist) * move;
      pos.z += (dz / dist) * move;
      task.body.group.rotation.y = Math.atan2(dx, dz);
    }
    if (this.camTween !== null) {
      this.stepClock = Math.min(1, this.stepClock + dt / this.camTween.dur);
      let e = this.stepClock;
      if (this.camTween.ease === "in") {
        e = e * e;
      } else if (this.camTween.ease === "out") {
        e = 1 - (1 - e) * (1 - e);
      } else if (this.camTween.ease !== "linear") {
        e = e * e * (3 - 2 * e);
      }
      this.camPos.lerpVectors(this.fromPos, this.camTween.pos, e);
      this.camLook.lerpVectors(this.fromLook, this.camTween.look, e);
      this.fov = this.fromFov + (this.toFov - this.fromFov) * e;
      this.applyCamera();
      if (this.stepClock >= 1) {
        this.camTween = null;
        this.stepClock = 0;
      }
    } else {
      this.applyCamera();
    }
    if (this.typing !== null && this.typing.shown < this.typing.full.length) {
      const before = Math.floor(this.typing.shown);
      this.typing.shown = Math.min(this.typing.full.length, this.typing.shown + dt * CHARS_PER_SEC);
      const after = Math.floor(this.typing.shown);
      for (let i = before; i < after; i++) {
        const ch = this.typing.full[i];
        if (ch !== " " && ch !== "\n" && ch !== " ") {
          this.typing.blip = (this.typing.blip || 0) + 1;
          if (this.typing.blip >= 2) {
            this.typing.blip = 0;
            this.audio.textBlip();
          }
        }
      }
      el("cine-say-text").textContent = this.typing.full.slice(0, Math.floor(this.typing.shown));
      if (this.typing.shown >= this.typing.full.length) {
        el("cine-say-more").classList.remove("hidden");
        this.waitingClick = true;
      }
      return;
    }
    if (this.typing !== null) {
      return;
    }
    this.stepT += dt;
    if (this.stepT >= this.stepDur && this.camTween === null) {
      this.nextStep();
    }
  }
}
