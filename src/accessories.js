export const ACCESSORIES = [
  { id: "mustache", slot: "face", nameKey: "acc.mustache.name" },
  { id: "beard", slot: "face", nameKey: "acc.beard.name" },
  { id: "cigar", slot: "mouth", nameKey: "acc.cigar.name" },
  { id: "eyepatch", slot: "eyes", nameKey: "acc.eyepatch.name" },
  { id: "star", slot: "chest", nameKey: "acc.star.name" },
  { id: "poncho", slot: "back", nameKey: "acc.poncho.name" },
  { id: "feather", slot: "hat", nameKey: "acc.feather.name" },
  { id: "monocle", slot: "eyes", nameKey: "acc.monocle.name" },
  { id: "scarf", slot: "back", nameKey: "acc.scarf.name" },
  { id: "bandolier", slot: "chest", nameKey: "acc.bandolier.name" },
  { id: "goldtooth", slot: "mouth", nameKey: "acc.goldtooth.name" },
  { id: "pipe", slot: "mouth", nameKey: "acc.pipe.name" },
  { id: "skullbadge", slot: "chest", nameKey: "acc.skullbadge.name" },
  { id: "hatband", slot: "hat", nameKey: "acc.hatband.name" },
  { id: "sideburns", slot: "face", nameKey: "acc.sideburns.name" },
  { id: "warpaint", slot: "face", nameKey: "acc.warpaint.name" }
];

export function seasonBadgeInfo(id) {
  const m = /^sbadge-s(\d+)-r(\d+)$/.exec(String(id));
  if (m === null) {
    return null;
  }
  return { season: Number(m[1]), rank: Number(m[2]) };
}

export function accessoryRarity(id) {
  const badge = seasonBadgeInfo(id);
  if (badge !== null) {
    return "mythic";
  }
  const epic = ["skullbadge", "goldtooth", "warpaint"];
  const rare = ["monocle", "bandolier", "hatband", "pipe", "scarf", "star", "poncho", "beard", "eyepatch"];
  if (epic.indexOf(id) !== -1) {
    return "epic";
  }
  if (rare.indexOf(id) !== -1) {
    return "rare";
  }
  return "common";
}

export function accessoryById(id) {
  const badge = seasonBadgeInfo(id);
  if (badge !== null) {
    return { id: id, slot: "chest", nameKey: null, badge: badge };
  }
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

  const badge = seasonBadgeInfo(id);
  if (badge !== null) {
    ctx.fillStyle = "#a83c2a";
    ctx.fillRect(38 * u, 8 * u, 20 * u, 22 * u);
    ctx.fillStyle = "#7a2a1e";
    ctx.fillRect(38 * u, 24 * u, 20 * u, 6 * u);
    let mainColor = "#e8b64c";
    let borderColor = "#7a4c15";
    let textColor = "#5a3410";
    if (badge.rank === 2) {
      mainColor = "#aeb3b8"; borderColor = "#5b6268"; textColor = "#1c2024";
    } else if (badge.rank === 3) {
      mainColor = "#d68b49"; borderColor = "#75451e"; textColor = "#4a2408";
    } else if (badge.rank <= 6) {
      mainColor = "#3b5998"; borderColor = "#263961"; textColor = "#ffffff";
    } else if (badge.rank > 6) {
      mainColor = "#3e6b4c"; borderColor = "#284a32"; textColor = "#ffffff";
    }
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(48 * u, 54 * u, 30 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 5 * u;
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = "bold " + 30 * u + "px 'Rye', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(badge.rank), 48 * u, 50 * u);
    ctx.font = "bold " + 12 * u + "px 'Special Elite', serif";
    ctx.fillText("S" + badge.season, 48 * u, 71 * u);
    return canvas.toDataURL();
  }

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
  } else if (id === "monocle") {
    ctx.strokeStyle = "#d8b13c";
    ctx.lineWidth = 6 * u;
    ctx.beginPath();
    ctx.arc(48 * u, 42 * u, 20 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#d8b13c";
    ctx.fillRect(46 * u, 62 * u, 4 * u, 22 * u);
  } else if (id === "scarf") {
    ctx.fillStyle = "#a83c2a";
    ctx.fillRect(22 * u, 30 * u, 52 * u, 16 * u);
    ctx.fillRect(52 * u, 44 * u, 16 * u, 34 * u);
    ctx.fillStyle = "#7a2a1e";
    ctx.fillRect(52 * u, 70 * u, 16 * u, 8 * u);
  } else if (id === "bandolier") {
    ctx.strokeStyle = "#4a3018";
    ctx.lineWidth = 12 * u;
    ctx.beginPath();
    ctx.moveTo(18 * u, 20 * u);
    ctx.lineTo(78 * u, 76 * u);
    ctx.stroke();
    ctx.fillStyle = "#d8b13c";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect((26 + i * 12) * u, (26 + i * 11) * u, 6 * u, 10 * u);
    }
  } else if (id === "goldtooth") {
    ctx.fillStyle = "#f0ead8";
    ctx.fillRect(24 * u, 40 * u, 48 * u, 18 * u);
    ctx.fillStyle = "#e8b64c";
    ctx.fillRect(50 * u, 40 * u, 10 * u, 18 * u);
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(24 * u, 36 * u, 48 * u, 5 * u);
  } else if (id === "pipe") {
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(22 * u, 46 * u, 40 * u, 8 * u);
    ctx.fillRect(56 * u, 46 * u, 12 * u, 22 * u);
    ctx.fillStyle = "#3a2412";
    ctx.fillRect(54 * u, 42 * u, 16 * u, 8 * u);
  } else if (id === "skullbadge") {
    ctx.fillStyle = "#e8e0cf";
    ctx.fillRect(32 * u, 26 * u, 32 * u, 26 * u);
    ctx.fillRect(38 * u, 50 * u, 20 * u, 12 * u);
    ctx.fillStyle = "#14100a";
    ctx.fillRect(38 * u, 34 * u, 8 * u, 8 * u);
    ctx.fillRect(50 * u, 34 * u, 8 * u, 8 * u);
    ctx.fillRect(44 * u, 52 * u, 8 * u, 8 * u);
  } else if (id === "hatband") {
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(20 * u, 30 * u, 56 * u, 14 * u);
    ctx.fillStyle = "#d8b13c";
    ctx.fillRect(20 * u, 44 * u, 56 * u, 12 * u);
    ctx.fillStyle = "#a83c2a";
    ctx.fillRect(44 * u, 44 * u, 8 * u, 12 * u);
  } else if (id === "sideburns") {
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(20 * u, 26 * u, 12 * u, 40 * u);
    ctx.fillRect(64 * u, 26 * u, 12 * u, 40 * u);
    ctx.fillRect(20 * u, 60 * u, 16 * u, 10 * u);
    ctx.fillRect(60 * u, 60 * u, 16 * u, 10 * u);
  } else if (id === "warpaint") {
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(22 * u, 40 * u, 20 * u, 6 * u);
    ctx.fillRect(54 * u, 40 * u, 20 * u, 6 * u);
    ctx.fillRect(22 * u, 52 * u, 20 * u, 6 * u);
    ctx.fillRect(54 * u, 52 * u, 20 * u, 6 * u);
    ctx.fillStyle = "#e8e0cf";
    ctx.fillRect(40 * u, 22 * u, 16 * u, 6 * u);
  }

  return canvas.toDataURL();
}
