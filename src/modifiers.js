export const MODIFIERS = [
  {
    id: "noon",
    name: "PLEIN SOLEIL",
    desc: "Conditions parfaites. Que le plus rapide gagne.",
    distance: 14,
    accuracyFactor: 1,
    aimPenalty: 0,
    sway: 0
  },
  {
    id: "dusk",
    name: "CRÉPUSCULE",
    desc: "La nuit tombe, on ne distingue que les silhouettes.",
    distance: 14,
    accuracyFactor: 0.82,
    aimPenalty: 90,
    sway: 0
  },
  {
    id: "fog",
    name: "BRUME",
    desc: "Un brouillard épais noie la rue.",
    distance: 12,
    accuracyFactor: 0.8,
    aimPenalty: 110,
    sway: 0
  },
  {
    id: "range",
    name: "LONGUE PORTÉE",
    desc: "Vingt-six mètres séparent les duellistes.",
    distance: 26,
    accuracyFactor: 0.78,
    aimPenalty: 140,
    sway: 0
  },
  {
    id: "wind",
    name: "RAFALES",
    desc: "Le vent secoue les bras et fait valser la poussière.",
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
