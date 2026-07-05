export const SKINS = [
  {
    id: "drifter",
    price: 0,
    nameKey: "skin.drifter.name",
    colors: { skin: 0xc98f5e, shirt: 0x7a2f24, pants: 0x30425c, hat: 0x4a3018, bandana: 0xc9a227 }
  },
  {
    id: "sheriff",
    price: 150,
    nameKey: "skin.sheriff.name",
    colors: { skin: 0xc98f5e, shirt: 0x8a6f3a, pants: 0x4a3524, hat: 0x6b4a1f, bandana: 0xd8c48a }
  },
  {
    id: "bandit",
    price: 200,
    nameKey: "skin.bandit.name",
    colors: { skin: 0xb5825a, shirt: 0x23211f, pants: 0x1c1a18, hat: 0x141210, bandana: 0xb3271e }
  },
  {
    id: "poncho",
    price: 250,
    nameKey: "skin.poncho.name",
    colors: { skin: 0xa9744a, shirt: 0x2e6b4f, pants: 0x5a4326, hat: 0x7a5a2a, bandana: 0xe0d3a8 }
  },
  {
    id: "cavalry",
    price: 350,
    nameKey: "skin.cavalry.name",
    colors: { skin: 0xc98f5e, shirt: 0x1f3a6b, pants: 0x14243f, hat: 0x2b2b30, bandana: 0xd8b13c }
  },
  {
    id: "undertaker",
    price: 500,
    nameKey: "skin.undertaker.name",
    colors: { skin: 0xd0b294, shirt: 0x2b2233, pants: 0x191423, hat: 0x0f0c14, bandana: 0x8a8f98 }
  },
  {
    id: "ghost",
    price: 650,
    nameKey: "skin.ghost.name",
    colors: { skin: 0xd8cdbf, shirt: 0xcfc6b8, pants: 0xa89f8f, hat: 0xe4dccd, bandana: 0xffffff }
  },
  {
    id: "golden",
    price: 900,
    nameKey: "skin.golden.name",
    colors: { skin: 0xc98f5e, shirt: 0xd4a017, pants: 0x8a6510, hat: 0xe8b64c, bandana: 0xfff1c4 }
  }
];

export function skinById(id) {
  for (const skin of SKINS) {
    if (skin.id === id) {
      return skin;
    }
  }
  return SKINS[0];
}

function css(color) {
  return "#" + color.toString(16).padStart(6, "0");
}

function shade(color, factor) {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((color & 255) * factor));
  return (r << 16) | (g << 8) | b;
}

export function portraitDataUrl(skinId, size) {
  const skin = skinById(skinId);
  const c = skin.colors;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const u = size / 96;

  ctx.fillStyle = css(shade(c.shirt, 0.9));
  ctx.fillRect(20 * u, 78 * u, 56 * u, 18 * u);
  ctx.fillStyle = css(c.bandana);
  ctx.fillRect(30 * u, 72 * u, 36 * u, 9 * u);
  ctx.fillStyle = css(c.skin);
  ctx.fillRect(30 * u, 38 * u, 36 * u, 36 * u);
  ctx.fillStyle = css(shade(c.skin, 0.75));
  ctx.fillRect(30 * u, 38 * u, 36 * u, 5 * u);
  ctx.fillStyle = "#1c1208";
  ctx.fillRect(38 * u, 52 * u, 5 * u, 6 * u);
  ctx.fillRect(53 * u, 52 * u, 5 * u, 6 * u);
  ctx.fillStyle = css(c.hat);
  ctx.fillRect(16 * u, 32 * u, 64 * u, 8 * u);
  ctx.fillRect(28 * u, 12 * u, 40 * u, 22 * u);
  ctx.fillStyle = css(shade(c.hat, 1.5));
  ctx.fillRect(28 * u, 28 * u, 40 * u, 4 * u);

  return canvas.toDataURL();
}
