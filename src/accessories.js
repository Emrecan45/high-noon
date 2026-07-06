export const ACCESSORIES = [
  { id: "mustache", slot: "face", nameKey: "acc.mustache.name" },
  { id: "beard", slot: "face", nameKey: "acc.beard.name" },
  { id: "cigar", slot: "mouth", nameKey: "acc.cigar.name" },
  { id: "eyepatch", slot: "eyes", nameKey: "acc.eyepatch.name" },
  { id: "star", slot: "chest", nameKey: "acc.star.name" },
  { id: "poncho", slot: "back", nameKey: "acc.poncho.name" },
  { id: "feather", slot: "hat", nameKey: "acc.feather.name" }
];

export function accessoryById(id) {
  for (const acc of ACCESSORIES) {
    if (acc.id === id) {
      return acc;
    }
  }
  return null;
}

export function accessoryIconDataUrl(id, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const u = size / 96;

  if (id === "mustache") {
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(20 * u, 44 * u, 56 * u, 12 * u);
    ctx.fillRect(14 * u, 50 * u, 12 * u, 10 * u);
    ctx.fillRect(70 * u, 50 * u, 12 * u, 10 * u);
  } else if (id === "beard") {
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(24 * u, 34 * u, 48 * u, 34 * u);
    ctx.fillRect(32 * u, 66 * u, 32 * u, 12 * u);
    ctx.clearRect(36 * u, 34 * u, 24 * u, 12 * u);
  } else if (id === "cigar") {
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(18 * u, 44 * u, 52 * u, 12 * u);
    ctx.fillStyle = "#e8b64c";
    ctx.fillRect(66 * u, 44 * u, 8 * u, 12 * u);
    ctx.fillStyle = "#ff7a3c";
    ctx.fillRect(74 * u, 44 * u, 6 * u, 12 * u);
  } else if (id === "eyepatch") {
    ctx.fillStyle = "#14100a";
    ctx.fillRect(34 * u, 36 * u, 28 * u, 24 * u);
    ctx.fillRect(10 * u, 30 * u, 26 * u, 6 * u);
    ctx.fillRect(60 * u, 30 * u, 26 * u, 6 * u);
  } else if (id === "star") {
    ctx.fillStyle = "#e8b64c";
    ctx.save();
    ctx.translate(48 * u, 48 * u);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outer = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const inner = outer + Math.PI / 5;
      ctx.lineTo(Math.cos(outer) * 34 * u, Math.sin(outer) * 34 * u);
      ctx.lineTo(Math.cos(inner) * 14 * u, Math.sin(inner) * 14 * u);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (id === "poncho") {
    ctx.fillStyle = "#2e6b4f";
    ctx.beginPath();
    ctx.moveTo(48 * u, 14 * u);
    ctx.lineTo(84 * u, 74 * u);
    ctx.lineTo(12 * u, 74 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e0d3a8";
    ctx.fillRect(12 * u, 66 * u, 72 * u, 5 * u);
  } else if (id === "feather") {
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(42 * u, 14 * u, 12 * u, 54 * u);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(36 * u, 22 * u, 8 * u, 38 * u);
    ctx.fillRect(54 * u, 22 * u, 8 * u, 38 * u);
    ctx.fillStyle = "#8a5a2e";
    ctx.fillRect(44 * u, 66 * u, 8 * u, 16 * u);
  }

  return canvas.toDataURL();
}
