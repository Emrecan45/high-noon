export const PERKS = [
  {
    id: "hands",
    icon: "🔫",
    name: "Mains rapides",
    desc: "Rechargement 40% plus rapide après un tir manqué."
  },
  {
    id: "step",
    icon: "💨",
    name: "Pas de côté",
    desc: "Une esquive supplémentaire à chaque manche."
  },
  {
    id: "eye",
    icon: "🦅",
    name: "Œil d'aigle",
    desc: "La visée pardonne : les tirs proches de la tête comptent."
  }
];

export function perkById(id) {
  for (const perk of PERKS) {
    if (perk.id === id) {
      return perk;
    }
  }
  return null;
}
