export const ACCESSORIES = [
  { id: "shorthair", slot: "hair", nameKey: "acc.shorthair.name" },
  { id: "longhair", slot: "hair", nameKey: "acc.longhair.name" },
  { id: "ponytail", slot: "hair", nameKey: "acc.ponytail.name" },
  { id: "braids", slot: "hair", nameKey: "acc.braids.name" },
  { id: "bald", slot: "hair", nameKey: "acc.bald.name" },
  { id: "mustache", slot: "face", nameKey: "acc.mustache.name" },
  { id: "beard", slot: "face", nameKey: "acc.beard.name" },
  { id: "cigar", slot: "mouth", nameKey: "acc.cigar.name" },
  { id: "eyepatch", slot: "eyes", nameKey: "acc.eyepatch.name" },
  { id: "star", slot: "chest", nameKey: "acc.star.name" },
  { id: "feather", slot: "hat", nameKey: "acc.feather.name" },
  { id: "monocle", slot: "eyes", nameKey: "acc.monocle.name" },
  { id: "bandolier", slot: "chest", nameKey: "acc.bandolier.name" },
  { id: "goldtooth", slot: "mouth", nameKey: "acc.goldtooth.name" },
  { id: "pipe", slot: "mouth", nameKey: "acc.pipe.name" },
  { id: "skullbadge", slot: "chest", nameKey: "acc.skullbadge.name" },
  { id: "hatband", slot: "hat", nameKey: "acc.hatband.name" },
  { id: "sideburns", slot: "face", nameKey: "acc.sideburns.name" },
  { id: "goatee", slot: "face", nameKey: "acc.goatee.name" },
  { id: "chinstrap", slot: "face", nameKey: "acc.chinstrap.name" },
  { id: "toothpick", slot: "mouth", nameKey: "acc.toothpick.name" },
  { id: "cigarette", slot: "mouth", nameKey: "acc.cigarette.name" },
  { id: "shades", slot: "eyes", nameKey: "acc.shades.name" },
  { id: "spectacles", slot: "eyes", nameKey: "acc.spectacles.name" },
  { id: "blindfold", slot: "eyes", nameKey: "acc.blindfold.name" },
  { id: "deputybadge", slot: "chest", nameKey: "acc.deputybadge.name" },
  { id: "medallion", slot: "chest", nameKey: "acc.medallion.name" },
  { id: "cardband", slot: "hat", nameKey: "acc.cardband.name" },
  { id: "sheriffpin", slot: "hat", nameKey: "acc.sheriffpin.name" },
  { id: "bulletband", slot: "hat", nameKey: "acc.bulletband.name" },
  { id: "paper-burned", slot: "posterpaper", nameKey: "acc.paper-burned.name" },
  { id: "paper-torn", slot: "posterpaper", nameKey: "acc.paper-torn.name" },
  { id: "paper-stained", slot: "posterpaper", nameKey: "acc.paper-stained.name" },
  { id: "stamp-outlaw", slot: "posterstamp", nameKey: "acc.stamp-outlaw.name" },
  { id: "stamp-reward", slot: "posterstamp", nameKey: "acc.stamp-reward.name" },
  { id: "stamp-nomercy", slot: "posterstamp", nameKey: "acc.stamp-nomercy.name" },
  { id: "ink-black", slot: "posterink", nameKey: "acc.ink-black.name" },
  { id: "ink-blood", slot: "posterink", nameKey: "acc.ink-blood.name" },
  { id: "ink-blue", slot: "posterink", nameKey: "acc.ink-blue.name" },
  { id: "ink-green", slot: "posterink", nameKey: "acc.ink-green.name" },
  { id: "ink-purple", slot: "posterink", nameKey: "acc.ink-purple.name" },
  { id: "ink-gold", slot: "posterink", nameKey: "acc.ink-gold.name" },
  { id: "pose-draw", slot: "posterpose", nameKey: "acc.pose-draw.name" },
  { id: "pose-holster", slot: "posterpose", nameKey: "acc.pose-holster.name" },
  { id: "nick-fantasma", slot: "posternick", nameKey: "acc.nick-fantasma.name" },
  { id: "nick-tornado", slot: "posternick", nameKey: "acc.nick-tornado.name" },
  { id: "nick-vibora", slot: "posternick", nameKey: "acc.nick-vibora.name" }
];

export function seasonBadgeInfo(id) {
  const m = /^sbadge-s(\d+)-r(\d+)$/.exec(String(id));
  if (m === null) {
    return null;
  }
  return { season: Number(m[1]), rank: Number(m[2]) };
}

export function seasonTitleInfo(id) {
  const m = /^title-s(\d+)-r(\d+)$/.exec(String(id));
  if (m === null) {
    return null;
  }
  return { season: Number(m[1]), rank: Number(m[2]) };
}

export function seasonTitleLabel(id) {
  const info = seasonTitleInfo(id);
  if (info === null) {
    return null;
  }
  return "TOP " + info.rank + " - SAISON " + info.season;
}

export function accessoryRarity(id) {
  const badge = seasonBadgeInfo(id);
  if (badge !== null) {
    return "mythic";
  }
  if (seasonTitleInfo(id) !== null) {
    return "mythic";
  }
  const legendary = ["stamp-nomercy", "ink-blood", "ink-gold", "nick-fantasma", "nick-tornado", "nick-vibora"];
  const epic = ["braids", "beard", "goldtooth", "blindfold", "skullbadge", "medallion", "sheriffpin", "paper-burned", "stamp-outlaw", "stamp-reward", "pose-draw", "monocle", "ink-purple"];
  const rare = ["ponytail", "longhair", "goatee", "sideburns", "pipe", "cigar", "eyepatch", "shades", "star", "bandolier", "hatband", "cardband", "paper-torn", "paper-stained", "ink-black", "ink-blue", "ink-green", "pose-holster"];
  if (legendary.indexOf(id) !== -1) {
    return "legendary";
  }
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
    return { id: id, slot: "badge", nameKey: null, badge: badge };
  }
  const title = seasonTitleInfo(id);
  if (title !== null) {
    return { id: id, slot: "posternick", nameKey: null, title: title };
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

  const title = seasonTitleInfo(id);
  if (title !== null) {
    let fill = "#a83c2a";
    let border = "#5f1d12";
    let ink = "#f4e4c0";
    if (title.rank === 1) {
      fill = "#e8b64c"; border = "#7a4c15"; ink = "#3a2410";
    } else if (title.rank === 2) {
      fill = "#c8ccd0"; border = "#5b6268"; ink = "#1c2024";
    } else if (title.rank === 3) {
      fill = "#cf8b4e"; border = "#75451e"; ink = "#3a1e08";
    }
    ctx.fillStyle = fill;
    ctx.fillRect(15 * u, 22 * u, 66 * u, 52 * u);
    ctx.strokeStyle = border;
    ctx.lineWidth = 3 * u;
    ctx.strokeRect(15 * u, 22 * u, 66 * u, 52 * u);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(15 * u) + "px 'Rye', serif";
    ctx.fillText("TOP " + title.rank, 48 * u, 48 * u);
    return canvas.toDataURL();
  }

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
    ctx.fillRect(56 * u, 32 * u, 12 * u, 22 * u);
    ctx.fillStyle = "#3a2412";
    ctx.fillRect(54 * u, 28 * u, 16 * u, 8 * u);
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
  } else if (id === "goatee") {
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(40 * u, 52 * u, 16 * u, 20 * u);
    ctx.fillRect(36 * u, 44 * u, 24 * u, 8 * u);
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
  } else if (id === "shades") {
    ctx.fillStyle = "#14100a";
    ctx.fillRect(20 * u, 40 * u, 24 * u, 16 * u);
    ctx.fillRect(52 * u, 40 * u, 24 * u, 16 * u);
    ctx.fillRect(44 * u, 44 * u, 8 * u, 5 * u);
  } else if (id === "spectacles") {
    ctx.strokeStyle = "#c8b06a";
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.arc(32 * u, 46 * u, 12 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(64 * u, 46 * u, 12 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(44 * u, 46 * u);
    ctx.lineTo(52 * u, 46 * u);
    ctx.stroke();
  } else if (id === "blindfold") {
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(14 * u, 40 * u, 68 * u, 16 * u);
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(14 * u, 46 * u, 68 * u, 4 * u);
  } else if (id === "deputybadge") {
    ctx.fillStyle = "#aeb3b8";
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
  } else if (id === "cardband") {
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(18 * u, 54 * u, 60 * u, 12 * u);
    ctx.fillStyle = "#f0ead8";
    ctx.fillRect(52 * u, 40 * u, 20 * u, 28 * u);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(60 * u, 50 * u, 6 * u, 8 * u);
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
  } else if (id === "shorthair") {
    ctx.fillStyle = "#6b4423";
    ctx.beginPath();
    ctx.arc(48 * u, 44 * u, 26 * u, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(22 * u, 44 * u, 52 * u, 10 * u);
    ctx.fillRect(22 * u, 44 * u, 10 * u, 26 * u);
    ctx.fillRect(64 * u, 44 * u, 10 * u, 26 * u);
  } else if (id === "longhair") {
    ctx.fillStyle = "#6b4423";
    ctx.beginPath();
    ctx.arc(44 * u, 42 * u, 24 * u, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(20 * u, 42 * u, 48 * u, 30 * u);
  } else if (id === "ponytail") {
    ctx.fillStyle = "#6b4423";
    ctx.beginPath();
    ctx.arc(44 * u, 42 * u, 24 * u, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(20 * u, 42 * u, 48 * u, 10 * u);
    ctx.fillRect(20 * u, 42 * u, 9 * u, 22 * u);
    ctx.fillRect(58 * u, 42 * u, 17 * u, 42 * u);
    ctx.fillStyle = "#a83c2a";
    ctx.fillRect(56 * u, 47 * u, 21 * u, 8 * u);
  } else if (id === "braids") {
    ctx.fillStyle = "#6b4423";
    ctx.beginPath();
    ctx.arc(48 * u, 40 * u, 24 * u, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(24 * u, 40 * u, 48 * u, 10 * u);
    for (const bx of [22, 62]) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "#6b4423";
        ctx.fillRect((bx + (i % 2) * 4) * u, (48 + i * 9) * u, 13 * u, 9 * u);
      }
      ctx.fillStyle = "#a83c2a";
      ctx.fillRect((bx + 1) * u, 84 * u, 13 * u, 5 * u);
    }
  } else if (id === "bald") {
    ctx.fillStyle = "#6b4423";
    ctx.fillRect(20 * u, 52 * u, 12 * u, 16 * u);
    ctx.fillRect(64 * u, 52 * u, 12 * u, 16 * u);
    ctx.strokeStyle = "#c8b8a0";
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.arc(48 * u, 50 * u, 24 * u, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#c8b8a0";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect((32 + i * 4) * u, (38 + ((i * 7) % 5)) * u, 2 * u, 2 * u);
    }
  } else if (id.indexOf("paper-") === 0) {
    ctx.fillStyle = "#e0cfa0";
    ctx.fillRect(24 * u, 14 * u, 48 * u, 68 * u);
    ctx.strokeStyle = "#43290f";
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(25 * u, 15 * u, 46 * u, 66 * u);
    if (id === "paper-burned") {
      ctx.fillStyle = "#3a2410";
      ctx.beginPath();
      ctx.arc(26 * u, 16 * u, 10 * u, 0, Math.PI * 2);
      ctx.arc(70 * u, 80 * u, 12 * u, 0, Math.PI * 2);
      ctx.arc(70 * u, 18 * u, 7 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a4616";
      ctx.beginPath();
      ctx.arc(28 * u, 18 * u, 6 * u, 0, Math.PI * 2);
      ctx.arc(68 * u, 78 * u, 7 * u, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "paper-torn") {
      ctx.fillStyle = "#2a1c10";
      ctx.beginPath();
      ctx.moveTo(24 * u, 40 * u);
      ctx.lineTo(40 * u, 46 * u);
      ctx.lineTo(24 * u, 52 * u);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(72 * u, 60 * u);
      ctx.lineTo(56 * u, 66 * u);
      ctx.lineTo(72 * u, 72 * u);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(106, 62, 22, 0.7)";
      ctx.lineWidth = 4 * u;
      ctx.beginPath();
      ctx.arc(58 * u, 64 * u, 12 * u, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id.indexOf("stamp-") === 0) {
    ctx.save();
    ctx.translate(48 * u, 48 * u);
    ctx.rotate(-0.28);
    ctx.strokeStyle = "#a8201a";
    ctx.lineWidth = 4 * u;
    ctx.strokeRect(-38 * u, -16 * u, 76 * u, 32 * u);
    ctx.fillStyle = "#a8201a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let word = "OUTLAW";
    if (id === "stamp-reward") {
      word = "REWARD";
    } else if (id === "stamp-nomercy") {
      word = "NO MERCY";
    }
    ctx.font = "bold " + Math.round(word.length > 6 ? 14 * u : 18 * u) + "px 'Rye', serif";
    ctx.fillText(word, 0, 1 * u);
    ctx.restore();
  } else if (id.indexOf("ink-") === 0) {
    const inkColors = {
      "ink-blood": "#7a1e1e",
      "ink-blue": "#26417c",
      "ink-green": "#245e34",
      "ink-purple": "#502a7e",
      "ink-gold": "#9a7016"
    };
    const inkColor = inkColors[id] || "#1a1a1a";
    ctx.fillStyle = inkColor;
    ctx.fillRect(36 * u, 40 * u, 24 * u, 34 * u);
    ctx.fillRect(42 * u, 30 * u, 12 * u, 12 * u);
    ctx.fillStyle = "#c8a86a";
    ctx.fillRect(42 * u, 26 * u, 12 * u, 6 * u);
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.arc(64 * u, 68 * u, 6 * u, 0, Math.PI * 2);
    ctx.arc(70 * u, 76 * u, 3.5 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (id.indexOf("pose-") === 0) {
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(40 * u, 22 * u, 16 * u, 14 * u);
    ctx.fillRect(36 * u, 38 * u, 24 * u, 30 * u);
    if (id === "pose-draw") {
      ctx.fillRect(58 * u, 40 * u, 18 * u, 7 * u);
      ctx.fillStyle = "#8a8f98";
      ctx.fillRect(72 * u, 36 * u, 14 * u, 6 * u);
    } else {
      ctx.fillRect(58 * u, 52 * u, 10 * u, 7 * u);
      ctx.fillStyle = "#5c3a1e";
      ctx.fillRect(60 * u, 58 * u, 10 * u, 14 * u);
    }
  } else if (id.indexOf("nick-") === 0) {
    ctx.fillStyle = "#e8b64c";
    ctx.font = "bold " + Math.round(34 * u) + "px 'Rye', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("« »", 48 * u, 40 * u);
    ctx.font = Math.round(13 * u) + "px 'Special Elite', serif";
    let alias = "El Fantasma";
    if (id === "nick-tornado") {
      alias = "El Tornado";
    } else if (id === "nick-vibora") {
      alias = "La Víbora";
    }
    ctx.fillText(alias, 48 * u, 66 * u);
  }

  return canvas.toDataURL();
}
