export const MODIFIERS = [
  {
    id: "noon",
    nameKey: "mod.noon.name",
    descKey: "mod.noon.desc",
    accuracyFactor: 1,
    aimPenalty: 0,
    sway: 0
  },
  {
    id: "dusk",
    nameKey: "mod.dusk.name",
    descKey: "mod.dusk.desc",
    accuracyFactor: 0.85,
    aimPenalty: 70,
    sway: 0
  },
  {
    id: "fog",
    nameKey: "mod.fog.name",
    descKey: "mod.fog.desc",
    accuracyFactor: 0.82,
    aimPenalty: 90,
    sway: 0
  },
  {
    id: "wind",
    nameKey: "mod.wind.name",
    descKey: "mod.wind.desc",
    accuracyFactor: 0.88,
    aimPenalty: 60,
    sway: 1
  }
];

export const DISTANCE_TIERS = [
  { id: "close", meters: 12, accuracyFactor: 1, aimPenalty: 0 },
  { id: "medium", meters: 19, accuracyFactor: 0.95, aimPenalty: 30 },
  { id: "far", meters: 35, accuracyFactor: 0.8, aimPenalty: 90 }
];

export function pickModifier(rng, roundIndex, previousId) {
  if (roundIndex === 0) {
    return MODIFIERS[0];
  }
  const pool = MODIFIERS.filter(function (mod) {
    return mod.id !== previousId;
  });
  const idx = Math.floor(rng() * pool.length);
  return pool[Math.min(idx, pool.length - 1)];
}

export function pickDistance(rng, roundIndex) {
  if (roundIndex === 0) {
    return DISTANCE_TIERS[1];
  }
  const idx = Math.floor(rng() * DISTANCE_TIERS.length);
  return DISTANCE_TIERS[Math.min(idx, DISTANCE_TIERS.length - 1)];
}
