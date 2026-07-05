export const PERKS = [
  { id: "hands", icon: "🔫", nameKey: "perk.hands.name", descKey: "perk.hands.desc" },
  { id: "step", icon: "💨", nameKey: "perk.step.name", descKey: "perk.step.desc" },
  { id: "eye", icon: "🦅", nameKey: "perk.eye.name", descKey: "perk.eye.desc" },
  { id: "vest", icon: "🦺", nameKey: "perk.vest.name", descKey: "perk.vest.desc" },
  { id: "calm", icon: "❄️", nameKey: "perk.calm.name", descKey: "perk.calm.desc" },
  { id: "draw", icon: "⚡", nameKey: "perk.draw.name", descKey: "perk.draw.desc" },
  { id: "brim", icon: "🕶️", nameKey: "perk.brim.name", descKey: "perk.brim.desc" },
  { id: "spurs", icon: "🥾", nameKey: "perk.spurs.name", descKey: "perk.spurs.desc" }
];

export function perkById(id) {
  for (const perk of PERKS) {
    if (perk.id === id) {
      return perk;
    }
  }
  return null;
}

export function pickPerkOptions(owned, count) {
  const available = PERKS.filter(function (perk) {
    return !owned.has(perk.id);
  });
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = available[i];
    available[i] = available[j];
    available[j] = tmp;
  }
  return available.slice(0, count);
}
