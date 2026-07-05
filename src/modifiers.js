export const MODIFIERS = [
  {
    id: "noon",
    nameKey: "mod.noon.name",
    descKey: "mod.noon.desc",
    distance: 14,
    accuracyFactor: 1,
    aimPenalty: 0,
    sway: 0
  },
  {
    id: "dusk",
    nameKey: "mod.dusk.name",
    descKey: "mod.dusk.desc",
    distance: 14,
    accuracyFactor: 0.82,
    aimPenalty: 90,
    sway: 0
  },
  {
    id: "fog",
    nameKey: "mod.fog.name",
    descKey: "mod.fog.desc",
    distance: 12,
    accuracyFactor: 0.8,
    aimPenalty: 110,
    sway: 0
  },
  {
    id: "range",
    nameKey: "mod.range.name",
    descKey: "mod.range.desc",
    distance: 26,
    accuracyFactor: 0.78,
    aimPenalty: 140,
    sway: 0
  },
  {
    id: "wind",
    nameKey: "mod.wind.name",
    descKey: "mod.wind.desc",
    distance: 14,
    accuracyFactor: 0.85,
    aimPenalty: 80,
    sway: 1
  }
];

export function pickModifier(rng, roundIndex) {
  if (roundIndex === 0) {
    return MODIFIERS[0];
  }
  const pool = MODIFIERS.slice(1);
  const idx = Math.floor(rng() * pool.length);
  return pool[Math.min(idx, pool.length - 1)];
}
