import { rangeFrom } from "./rng.js";

export const AI_USABLE_PERKS = ["hands", "step", "eye", "vest"];

export const PERSONAS = [
  {
    id: "nervous",
    icon: "🤠",
    name: "Billy la Gâchette",
    descKey: "persona.nervous.desc",
    reaction: [175, 265],
    aim: [140, 280],
    accHead: 0.2,
    accBody: 0.5,
    misfireChance: 0.14,
    dodgeChance: 0.1,
    patience: 0
  },
  {
    id: "rapido",
    icon: "🌵",
    name: "El Rápido",
    descKey: "persona.rapido.desc",
    reaction: [145, 205],
    aim: [110, 215],
    accHead: 0.3,
    accBody: 0.4,
    misfireChance: 0.05,
    dodgeChance: 0.18,
    patience: 0.12
  },
  {
    id: "patient",
    icon: "🥃",
    name: "Doc Silence",
    descKey: "persona.patient.desc",
    reaction: [255, 345],
    aim: [150, 260],
    accHead: 0.34,
    accBody: 0.5,
    misfireChance: 0,
    dodgeChance: 0.26,
    patience: 0.5
  }
];

const DODGE_DURATION = 750;
const BASE_RELOAD = 1300;
const DRAW_LEAD = 260;

export class AiOpponent {
  constructor(persona, rng) {
    this.persona = persona;
    this.rng = rng;
    this.name = persona.name;
    this.perks = new Set();
    this.queue = [];
    this.plannedShot = null;
    this.wounded = false;
    this.accBoost = 1;
    this.modifier = null;
    this.done = false;
  }

  reloadDuration() {
    if (this.perks.has("hands")) {
      return BASE_RELOAD * 0.6;
    }
    return BASE_RELOAD;
  }

  aimTime() {
    let t = rangeFrom(this.rng, this.persona.aim[0], this.persona.aim[1]);
    t += this.modifier.aimPenalty;
    if (this.wounded) {
      t += 120;
    }
    return t;
  }

  rollOutcome() {
    let accHead = this.persona.accHead;
    let accBody = this.persona.accBody;
    if (this.perks.has("eye")) {
      accHead *= 1.25;
    }
    let factor = this.modifier.accuracyFactor * this.accBoost;
    if (this.wounded) {
      factor *= 0.8;
    }
    accHead *= factor;
    accBody *= factor;
    const r = this.rng();
    if (r < accHead) {
      return "head";
    }
    if (r < accHead + accBody) {
      return "body";
    }
    return "miss";
  }

  scheduleShot(t, boost) {
    this.accBoost = boost;
    this.plannedShot = t;
    this.pushEvent(t - DRAW_LEAD, { type: "draw" });
    this.pushEvent(t, { type: "shoot-planned" });
  }

  pushEvent(t, evt) {
    evt.t = t;
    this.queue.push(evt);
    this.queue.sort(function (a, b) {
      return a.t - b.t;
    });
  }

  startRound(ctx) {
    this.modifier = ctx.modifier;
    this.queue = [];
    this.plannedShot = null;
    this.wounded = false;
    this.accBoost = 1;
    this.done = false;
    let dodgeChance = this.persona.dodgeChance;
    if (this.perks.has("step")) {
      dodgeChance += 0.12;
    }
    if (this.rng() < this.persona.misfireChance) {
      const t = -rangeFrom(this.rng, 120, Math.max(200, ctx.signalDelay * 0.4));
      this.pushEvent(t, { type: "misfire" });
      return;
    }
    const reaction = rangeFrom(this.rng, this.persona.reaction[0], this.persona.reaction[1]);
    if (this.rng() < dodgeChance) {
      const dodgeAt = reaction * 0.9;
      let dir = 1;
      if (this.rng() < 0.5) {
        dir = -1;
      }
      this.pushEvent(dodgeAt, { type: "dodge", dir: dir });
      this.scheduleShot(dodgeAt + DODGE_DURATION + this.aimTime() * 0.8, 1);
      return;
    }
    let extra = 0;
    if (this.rng() < this.persona.patience) {
      extra = rangeFrom(this.rng, 250, 620);
    }
    this.scheduleShot(reaction + this.aimTime() + extra, 1);
  }

  clearPlannedShot() {
    this.queue = this.queue.filter(function (evt) {
      return evt.type !== "draw" && evt.type !== "shoot-planned";
    });
  }

  onPlayerDodge(tNow) {
    if (this.done) {
      return;
    }
    if (this.plannedShot !== null && this.plannedShot > tNow) {
      if (this.rng() < 0.35 + this.persona.patience) {
        this.clearPlannedShot();
        const punishAt = tNow + DODGE_DURATION + 120 + this.aimTime() * 0.5;
        this.scheduleShot(punishAt, 1.3);
      }
    }
  }

  onPlayerMiss(tNow) {
    if (this.done) {
      return;
    }
    if (this.plannedShot !== null && this.plannedShot > tNow + 400) {
      if (this.rng() < 0.4 + this.persona.patience) {
        this.clearPlannedShot();
        this.scheduleShot(tNow + this.aimTime() * 0.7, 1.2);
      }
    }
  }

  notifyWounded() {
    this.wounded = true;
  }

  onShotDodged(tNow) {
    if (this.done) {
      return;
    }
    this.clearPlannedShot();
    this.pushEvent(tNow + 60, { type: "reload" });
    this.scheduleShot(tNow + this.reloadDuration() + this.aimTime(), 1);
  }

  stop() {
    this.done = true;
    this.queue = [];
  }

  update(tSignal) {
    if (this.done) {
      return [];
    }
    const fired = [];
    while (this.queue.length > 0 && this.queue[0].t <= tSignal) {
      const evt = this.queue.shift();
      if (evt.type === "misfire") {
        fired.push(evt);
        this.stop();
        return fired;
      }
      if (evt.type === "shoot-planned") {
        const result = this.rollOutcome();
        fired.push({ type: "shoot", t: evt.t, result: result });
        if (result === "miss") {
          const nextAt = evt.t + this.reloadDuration() + this.aimTime();
          this.pushEvent(evt.t + 60, { type: "reload" });
          this.scheduleShot(nextAt, 1);
        } else {
          this.plannedShot = null;
        }
      } else {
        fired.push(evt);
      }
    }
    return fired;
  }

  pickPerk(available) {
    const idx = Math.floor(this.rng() * available.length);
    return available[Math.min(idx, available.length - 1)].id;
  }
}
