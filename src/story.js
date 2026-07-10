import { PERSONAS, TRAINING_PERSONA, STORY_PERSONAS } from "./ai.js";
import { cgDataGet, cgDataSet } from "./sdk.js";

export const CHAPTERS = [
  {
    id: "camp",
    icon: "🎯",
    persona: TRAINING_PERSONA,
    nameKey: "story.camp.name",
    descKey: "story.camp.desc",
    lineKey: "story.camp.line",
    modifier: "noon",
    distance: "close"
  },
  {
    id: "billy",
    icon: "🤠",
    persona: PERSONAS[0],
    nameKey: "story.billy.name",
    descKey: "story.billy.desc",
    lineKey: "story.billy.line",
    modifier: "noon",
    distance: "medium"
  },
  {
    id: "rapido",
    icon: "🌵",
    persona: PERSONAS[1],
    nameKey: "story.rapido.name",
    descKey: "story.rapido.desc",
    lineKey: "story.rapido.line",
    modifier: "wind",
    distance: "close"
  },
  {
    id: "doc",
    icon: "🥃",
    persona: PERSONAS[2],
    nameKey: "story.doc.name",
    descKey: "story.doc.desc",
    lineKey: "story.doc.line",
    modifier: "dusk",
    distance: "medium"
  },
  {
    id: "grace",
    icon: "🕯️",
    persona: STORY_PERSONAS.grace,
    nameKey: "story.grace.name",
    descKey: "story.grace.desc",
    lineKey: "story.grace.line",
    modifier: "fog",
    distance: "medium"
  },
  {
    id: "undertaker",
    icon: "⚰️",
    persona: STORY_PERSONAS.undertaker,
    nameKey: "story.undertaker.name",
    descKey: "story.undertaker.desc",
    lineKey: "story.undertaker.line",
    modifier: null,
    distance: "far",
    perks: ["vest", "eye"]
  }
];

export function storyProgress() {
  const raw = localStorage.getItem("hn-story");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(CHAPTERS.length, Math.floor(value));
}

export function restoreStoryBackup() {
  const remote = Number(cgDataGet("hn-story"));
  if (Number.isFinite(remote) && remote > storyProgress()) {
    localStorage.setItem("hn-story", String(Math.min(CHAPTERS.length, Math.floor(remote))));
  }
}

export function completeChapter(index) {
  if (index === storyProgress()) {
    const next = index + 1;
    localStorage.setItem("hn-story", String(next));
    cgDataSet("hn-story", String(next));
  }
}
