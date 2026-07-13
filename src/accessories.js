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
  { id: "warpaint", slot: "face", nameKey: "acc.warpaint.name" },
  { id: "goatee", slot: "face", nameKey: "acc.goatee.name" },
  { id: "handlebar", slot: "face", nameKey: "acc.handlebar.name" },
  { id: "chinstrap", slot: "face", nameKey: "acc.chinstrap.name" },
  { id: "toothpick", slot: "mouth", nameKey: "acc.toothpick.name" },
  { id: "cigarette", slot: "mouth", nameKey: "acc.cigarette.name" },
  { id: "matchstick", slot: "mouth", nameKey: "acc.matchstick.name" },
  { id: "rose", slot: "mouth", nameKey: "acc.rose.name" },
  { id: "shades", slot: "eyes", nameKey: "acc.shades.name" },
  { id: "spectacles", slot: "eyes", nameKey: "acc.spectacles.name" },
  { id: "goggles", slot: "eyes", nameKey: "acc.goggles.name" },
  { id: "warstripe", slot: "eyes", nameKey: "acc.warstripe.name" },
  { id: "blindfold", slot: "eyes", nameKey: "acc.blindfold.name" },
  { id: "deputybadge", slot: "chest", nameKey: "acc.deputybadge.name" },
  { id: "bolotie", slot: "chest", nameKey: "acc.bolotie.name" },
  { id: "pocketwatch", slot: "chest", nameKey: "acc.pocketwatch.name" },
  { id: "medallion", slot: "chest", nameKey: "acc.medallion.name" },
  { id: "cape", slot: "back", nameKey: "acc.cape.name" },
  { id: "duster", slot: "back", nameKey: "acc.duster.name" },
  { id: "serape", slot: "back", nameKey: "acc.serape.name" },
  { id: "bedroll", slot: "back", nameKey: "acc.bedroll.name" },
  { id: "satchel", slot: "back", nameKey: "acc.satchel.name" },
  { id: "cardband", slot: "hat", nameKey: "acc.cardband.name" },
  { id: "conchos", slot: "hat", nameKey: "acc.conchos.name" },
  { id: "sheriffpin", slot: "hat", nameKey: "acc.sheriffpin.name" },
  { id: "bulletband", slot: "hat", nameKey: "acc.bulletband.name" },
  { id: "snakeband", slot: "hat", nameKey: "acc.snakeband.name" }
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
  const epic = ["skullbadge", "goldtooth", "warpaint", "pocketwatch", "medallion", "goggles", "snakeband", "cape"];
  const rare = ["monocle", "bandolier", "hatband", "pipe", "scarf", "star", "poncho", "beard", "eyepatch", "goatee", "handlebar", "shades", "spectacles", "deputybadge", "bolotie", "duster", "serape", "cardband", "conchos", "sheriffpin"];
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
  } else if (id === "goatee") {
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(40 * u, 52 * u, 16 * u, 20 * u);
    ctx.fillRect(36 * u, 44 * u, 24 * u, 8 * u);
  } else if (id === "handlebar") {
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(24 * u, 46 * u, 48 * u, 10 * u);
    ctx.fillRect(16 * u, 38 * u, 12 * u, 12 * u);
    ctx.fillRect(68 * u, 38 * u, 12 * u, 12 * u);
  } else if (id === "chinstrap") {
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(20 * u, 30 * u, 8 * u, 42 * u);
    ctx.fillRect(68 * u, 30 * u, 8 * u, 42 * u);
    ctx.fillRect(20 * u, 64 * u, 56 * u, 8 * u);
  } else if (id === "toothpick") {
    ctx.strokeStyle = "#c8a86a";
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(30 * u, 58 * u);
    ctx.lineTo(70 * u, 46 * u);
    ctx.stroke();
  } else if (id === "cigarette") {
    ctx.fillStyle = "#f0ead8";
    ctx.fillRect(22 * u, 46 * u, 48 * u, 8 * u);
    ctx.fillStyle = "#ff7a3c";
    ctx.fillRect(70 * u, 46 * u, 8 * u, 8 * u);
  } else if (id === "matchstick") {
    ctx.fillStyle = "#c8a86a";
    ctx.fillRect(22 * u, 48 * u, 50 * u, 6 * u);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(70 * u, 44 * u, 10 * u, 12 * u);
  } else if (id === "rose") {
    ctx.fillStyle = "#3e6b4c";
    ctx.fillRect(22 * u, 50 * u, 40 * u, 5 * u);
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(66 * u, 46 * u, 12 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "shades") {
    ctx.fillStyle = "#14100a";
    ctx.fillRect(20 * u, 40 * u, 24 * u, 16 * u);
    ctx.fillRect(52 * u, 40 * u, 24 * u, 16 * u);
    ctx.fillRect(44 * u, 44 * u, 8 * u, 5 * u);
  } else if (id === "spectacles") {
    ctx.strokeStyle = "#c8b06a";
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.arc(34 * u, 46 * u, 14 * u, 0, Math.PI * 2);
    ctx.arc(62 * u, 46 * u, 14 * u, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === "goggles") {
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(16 * u, 38 * u, 64 * u, 8 * u);
    ctx.fillStyle = "#6a8ab0";
    ctx.fillRect(22 * u, 42 * u, 22 * u, 16 * u);
    ctx.fillRect(52 * u, 42 * u, 22 * u, 16 * u);
  } else if (id === "warstripe") {
    ctx.fillStyle = "#7a2a1e";
    ctx.fillRect(16 * u, 42 * u, 64 * u, 14 * u);
  } else if (id === "blindfold") {
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(14 * u, 40 * u, 68 * u, 16 * u);
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(14 * u, 46 * u, 68 * u, 4 * u);
  } else if (id === "deputybadge") {
    ctx.fillStyle = "#aeb3b8";
    ctx.beginPath();
    ctx.moveTo(48 * u, 20 * u);
    ctx.lineTo(74 * u, 34 * u);
    ctx.lineTo(66 * u, 72 * u);
    ctx.lineTo(30 * u, 72 * u);
    ctx.lineTo(22 * u, 34 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5b6268";
    ctx.fillRect(42 * u, 44 * u, 12 * u, 12 * u);
  } else if (id === "bolotie") {
    ctx.strokeStyle = "#2a1c10";
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.moveTo(38 * u, 20 * u);
    ctx.lineTo(48 * u, 50 * u);
    ctx.lineTo(58 * u, 20 * u);
    ctx.stroke();
    ctx.fillStyle = "#d8b13c";
    ctx.beginPath();
    ctx.arc(48 * u, 54 * u, 12 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "pocketwatch") {
    ctx.strokeStyle = "#d8b13c";
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(48 * u, 18 * u);
    ctx.lineTo(48 * u, 40 * u);
    ctx.stroke();
    ctx.fillStyle = "#e8b64c";
    ctx.beginPath();
    ctx.arc(48 * u, 58 * u, 20 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a3410";
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(48 * u, 58 * u);
    ctx.lineTo(48 * u, 46 * u);
    ctx.stroke();
  } else if (id === "medallion") {
    ctx.strokeStyle = "#3a2a18";
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(30 * u, 20 * u);
    ctx.lineTo(48 * u, 46 * u);
    ctx.lineTo(66 * u, 20 * u);
    ctx.stroke();
    ctx.fillStyle = "#e8b64c";
    ctx.beginPath();
    ctx.arc(48 * u, 58 * u, 18 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "cape") {
    ctx.fillStyle = "#4a1c22";
    ctx.beginPath();
    ctx.moveTo(30 * u, 20 * u);
    ctx.lineTo(66 * u, 20 * u);
    ctx.lineTo(76 * u, 78 * u);
    ctx.lineTo(20 * u, 78 * u);
    ctx.closePath();
    ctx.fill();
  } else if (id === "duster") {
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(28 * u, 20 * u, 40 * u, 60 * u);
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(46 * u, 20 * u, 4 * u, 60 * u);
  } else if (id === "serape") {
    ctx.fillStyle = "#b8562e";
    ctx.fillRect(24 * u, 22 * u, 48 * u, 56 * u);
    ctx.fillStyle = "#e0d3a8";
    ctx.fillRect(24 * u, 38 * u, 48 * u, 6 * u);
    ctx.fillStyle = "#3e6b4c";
    ctx.fillRect(24 * u, 56 * u, 48 * u, 6 * u);
  } else if (id === "bedroll") {
    ctx.fillStyle = "#8a6a3c";
    ctx.fillRect(18 * u, 40 * u, 60 * u, 18 * u);
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(18 * u, 40 * u, 8 * u, 18 * u);
    ctx.fillRect(70 * u, 40 * u, 8 * u, 18 * u);
  } else if (id === "satchel") {
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(30 * u, 40 * u, 36 * u, 34 * u);
    ctx.fillStyle = "#3a2412";
    ctx.fillRect(30 * u, 40 * u, 36 * u, 12 * u);
    ctx.strokeStyle = "#3a2412";
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.moveTo(34 * u, 40 * u);
    ctx.lineTo(60 * u, 14 * u);
    ctx.stroke();
  } else if (id === "cardband") {
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(18 * u, 54 * u, 60 * u, 12 * u);
    ctx.fillStyle = "#f0ead8";
    ctx.fillRect(52 * u, 40 * u, 20 * u, 28 * u);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(60 * u, 50 * u, 6 * u, 8 * u);
  } else if (id === "conchos") {
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(18 * u, 50 * u, 60 * u, 14 * u);
    ctx.fillStyle = "#aeb3b8";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc((28 + i * 14) * u, 57 * u, 5 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "sheriffpin") {
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(18 * u, 54 * u, 60 * u, 12 * u);
    ctx.fillStyle = "#e8b64c";
    ctx.save();
    ctx.translate(48 * u, 44 * u);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outer = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const inner = outer + Math.PI / 5;
      ctx.lineTo(Math.cos(outer) * 14 * u, Math.sin(outer) * 14 * u);
      ctx.lineTo(Math.cos(inner) * 6 * u, Math.sin(inner) * 6 * u);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (id === "bulletband") {
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(18 * u, 50 * u, 60 * u, 14 * u);
    ctx.fillStyle = "#d8b13c";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect((24 + i * 11) * u, 52 * u, 6 * u, 10 * u);
    }
  } else if (id === "snakeband") {
    ctx.fillStyle = "#3e6b4c";
    ctx.fillRect(18 * u, 50 * u, 60 * u, 14 * u);
    ctx.fillStyle = "#2a4a34";
    for (let i = 0; i < 6; i++) {
      ctx.fillRect((22 + i * 10) * u, 50 * u, 5 * u, 14 * u);
    }
  }

  return canvas.toDataURL();
}
