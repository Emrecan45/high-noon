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
