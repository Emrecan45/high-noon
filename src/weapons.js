export const WEAPONS = [
  {
    id: "iron",
    price: 0,
    weight: 0,
    nameKey: "weapon.iron.name",
    colors: { body: 0x2c2c30, metal: 0x3a3a40, grip: 0x5c3a1e }
  },
  {
    id: "silver",
    price: 200,
    weight: 3,
    nameKey: "weapon.silver.name",
    colors: { body: 0xb8c0c8, metal: 0xd8e0e8, grip: 0x3a2a18 }
  },
  {
    id: "ivory",
    price: 300,
    weight: 3,
    nameKey: "weapon.ivory.name",
    colors: { body: 0x30302f, metal: 0x44444c, grip: 0xe8e0cf }
  },
  {
    id: "ranger",
    price: 400,
    weight: 3,
    nameKey: "weapon.ranger.name",
    colors: { body: 0x243a2a, metal: 0x8a6f3a, grip: 0x4a3018 }
  },
  {
    id: "rose",
    price: 550,
    weight: 3,
    nameKey: "weapon.rose.name",
    colors: { body: 0x2a2230, metal: 0x9a6fb0, grip: 0x7a2f44 }
  },
  {
    id: "navy",
    price: 250,
    weight: 3,
    nameKey: "weapon.navy.name",
    colors: { body: 0x2a3a4a, metal: 0x5a6b7a, grip: 0x4a3018 }
  },
  {
    id: "peacemaker",
    price: 350,
    weight: 3,
    nameKey: "weapon.peacemaker.name",
    colors: { body: 0x3a3a40, metal: 0xc8ccd4, grip: 0x8a6a3c }
  },
  {
    id: "serpent",
    price: 450,
    weight: 2,
    nameKey: "weapon.serpent.name",
    colors: { body: 0x1e3a26, metal: 0x4a8a58, grip: 0x14261a }
  },
  {
    id: "coyote",
    price: 300,
    weight: 3,
    nameKey: "weapon.coyote.name",
    colors: { body: 0x6b4a26, metal: 0xa8743c, grip: 0x3a2a18 }
  },
  {
    id: "midnight",
    price: 550,
    weight: 2,
    nameKey: "weapon.midnight.name",
    colors: { body: 0x14141c, metal: 0x2a2a3a, grip: 0x1c1c26 }
  },
  {
    id: "bone",
    price: 500,
    weight: 2,
    nameKey: "weapon.bone.name",
    colors: { body: 0x44403a, metal: 0x6b665e, grip: 0xf0ead8 }
  },
  {
    id: "scarlet",
    price: 650,
    weight: 1,
    nameKey: "weapon.scarlet.name",
    colors: { body: 0x5a141a, metal: 0xa82a34, grip: 0x2a0c10 }
  },
  {
    id: "deputy",
    price: 400,
    weight: 2,
    nameKey: "weapon.deputy.name",
    colors: { body: 0x46464e, metal: 0x8a8f98, grip: 0x5c3a1e }
  },
  {
    id: "golden",
    price: 850,
    weight: 3,
    nameKey: "weapon.golden.name",
    colors: { body: 0xc68a2e, metal: 0xe8b64c, grip: 0x6b3f14 }
  }
];

export function weaponById(id) {
  for (const weapon of WEAPONS) {
    if (weapon.id === id) {
      return weapon;
    }
  }
  return WEAPONS[0];
}

function css(color) {
  return "#" + color.toString(16).padStart(6, "0");
}

export function weaponIconDataUrl(id, size) {
  const weapon = weaponById(id);
  const c = weapon.colors;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const u = size / 96;

  ctx.fillStyle = css(c.metal);
  ctx.fillRect(14 * u, 40 * u, 60 * u, 10 * u);
  ctx.fillStyle = css(c.body);
  ctx.fillRect(52 * u, 36 * u, 20 * u, 20 * u);
  ctx.beginPath();
  ctx.arc(58 * u, 52 * u, 9 * u, 0, Math.PI * 2);
  ctx.fillStyle = css(c.metal);
  ctx.fill();
  ctx.fillStyle = css(c.grip);
  ctx.save();
  ctx.translate(66 * u, 58 * u);
  ctx.rotate(0.4);
  ctx.fillRect(-6 * u, 0, 12 * u, 26 * u);
  ctx.restore();

  return canvas.toDataURL();
}
