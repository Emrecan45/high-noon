import { portraitDataUrl } from "./skins.js";

export const POSTER_RATIO = 370 / 250;

const NICK_LABELS = {
  "nick-fantasma": "El Fantasma",
  "nick-tornado": "El Tornado",
  "nick-vibora": "La Víbora"
};

const STAMP_LABELS = {
  "stamp-outlaw": "OUTLAW",
  "stamp-reward": "REWARD",
  "stamp-nomercy": "NO MERCY"
};

const INK_TONES = {
  "ink-black": { main: "#161616", sub: "#3a3a3a" },
  "ink-blood": { main: "#6b1616", sub: "#8a2f1d" },
  "ink-blue": { main: "#1e3a6b", sub: "#3a5c9a" },
  "ink-green": { main: "#1d5a30", sub: "#2f7a45" },
  "ink-purple": { main: "#4a2270", sub: "#6a3a96" },
  "ink-gold": { main: "#8a6212", sub: "#b8901e" }
};

export function titleLabel(id) {
  const m = /^title-s(\d+)-r(\d+)$/.exec(String(id));
  if (m === null) {
    return null;
  }
  return "TOP " + Number(m[2]) + " - SAISON " + Number(m[1]);
}

export function posterStyleOf(list) {
  const style = { paper: null, stamp: null, ink: null, nick: null };
  if (!Array.isArray(list)) {
    return style;
  }
  for (const id of list) {
    if (id.indexOf("paper-") === 0) {
      style.paper = id;
    } else if (STAMP_LABELS[id] !== undefined) {
      style.stamp = id;
    } else if (id.indexOf("ink-") === 0) {
      style.ink = id;
    } else if (NICK_LABELS[id] !== undefined) {
      style.nick = NICK_LABELS[id];
    } else if (titleLabel(id) !== null) {
      style.nick = titleLabel(id);
    }
  }
  return style;
}

function drawPaperEffect(ctx, style, left, top, w, h, s) {
  if (style.paper === "paper-burned") {
    
    ctx.strokeStyle = "rgba(40, 15, 5, 0.8)";
    ctx.lineWidth = 14 * s;
    ctx.strokeRect(left, top, w, h);
    ctx.strokeStyle = "rgba(84, 40, 12, 0.6)";
    ctx.lineWidth = 26 * s;
    ctx.strokeRect(left, top, w, h);

    const spots = [
      [left + 12 * s, top + 15 * s, 22],
      [left + w - 8 * s, top + h - 35 * s, 26],
      [left + w - 15 * s, top + 12 * s, 18],
      [left + 15 * s, top + h - 12 * s, 20],
      [left + w / 2, top + 8 * s, 14],
      [left + w / 2 - 20 * s, top + h - 6 * s, 16],
      [left + 6 * s, top + h / 2, 12],
      [left + w - 4 * s, top + h / 2 - 20 * s, 14]
    ];
    for (const spot of spots) {
      const burn = ctx.createRadialGradient(spot[0], spot[1], 1 * s, spot[0], spot[1], spot[2] * s);
      burn.addColorStop(0, "rgba(20, 10, 4, 0.95)");
      burn.addColorStop(0.4, "rgba(84, 40, 12, 0.8)");
      burn.addColorStop(1, "rgba(84, 40, 12, 0)");
      ctx.fillStyle = burn;
      ctx.beginPath();
      ctx.arc(spot[0], spot[1], spot[2] * s, 0, Math.PI * 2);
      ctx.fill();
      
      
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.arc(spot[0], spot[1], spot[2] * 0.4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (style.paper === "paper-torn") {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    
    
    ctx.beginPath();
    
    
    ctx.moveTo(left, top);
    for(let x = 0; x <= w; x += 15 * s) {
      let yOff = (Math.sin(x * 0.5) * 4 + Math.cos(x * 1.2) * 3) * s;
      ctx.lineTo(left + x, top + yOff);
    }
    
    for(let y = 0; y <= h; y += 18 * s) {
      let xOff = (Math.sin(y * 0.4) * 5 + Math.cos(y * 1.1) * 3) * s;
      ctx.lineTo(left + w - xOff, top + y);
    }
    
    for(let x = w; x >= 0; x -= 14 * s) {
      let yOff = (Math.sin(x * 0.6) * 5 + Math.cos(x * 1.3) * 4) * s;
      ctx.lineTo(left + x, top + h - yOff);
    }
    
    for(let y = h; y >= 0; y -= 16 * s) {
      let xOff = (Math.sin(y * 0.5) * 4 + Math.cos(y * 0.9) * 4) * s;
      ctx.lineTo(left + xOff, top + y);
    }
    
    
    ctx.lineTo(left - 50 * s, top - 50 * s);
    ctx.lineTo(left - 50 * s, top + h + 50 * s);
    ctx.lineTo(left + w + 50 * s, top + h + 50 * s);
    ctx.lineTo(left + w + 50 * s, top - 50 * s);
    ctx.lineTo(left - 50 * s, top - 50 * s);
    
    ctx.fill("evenodd");
    ctx.restore();
    
    
    ctx.save();
    ctx.strokeStyle = "rgba(90, 62, 28, 0.4)";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    
    ctx.moveTo(left, top);
    for(let x = 0; x <= w; x += 15 * s) {
      let yOff = (Math.sin(x * 0.5) * 4 + Math.cos(x * 1.2) * 3) * s;
      ctx.lineTo(left + x, top + yOff);
    }
    
    for(let y = 0; y <= h; y += 18 * s) {
      let xOff = (Math.sin(y * 0.4) * 5 + Math.cos(y * 1.1) * 3) * s;
      ctx.lineTo(left + w - xOff, top + y);
    }
    
    for(let x = w; x >= 0; x -= 14 * s) {
      let yOff = (Math.sin(x * 0.6) * 5 + Math.cos(x * 1.3) * 4) * s;
      ctx.lineTo(left + x, top + h - yOff);
    }
    
    for(let y = h; y >= 0; y -= 16 * s) {
      let xOff = (Math.sin(y * 0.5) * 4 + Math.cos(y * 0.9) * 4) * s;
      ctx.lineTo(left + xOff, top + y);
    }
    ctx.stroke();
    ctx.restore();
  } else if (style.paper === "paper-stained") {
    ctx.strokeStyle = "rgba(106, 62, 22, 0.45)";
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.arc(left + 52 * s, top + h - 62 * s, 26 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(106, 62, 22, 0.25)";
    ctx.lineWidth = 9 * s;
    ctx.beginPath();
    ctx.arc(left + 52 * s, top + h - 62 * s, 30 * s, 0.4, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = "rgba(106, 62, 22, 0.3)";
    ctx.beginPath();
    ctx.arc(left + w - 34 * s, top + 96 * s, 8 * s, 0, Math.PI * 2);
    ctx.arc(left + w - 24 * s, top + 106 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStamp(ctx, style, s, top) {
  if (style.stamp === null) {
    return;
  }
  const word = STAMP_LABELS[style.stamp];
  ctx.save();
  ctx.translate(0, top + 210 * s);
  ctx.rotate(-0.26);
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = "#a8201a";
  ctx.lineWidth = 4 * s;
  ctx.strokeRect(-92 * s, -24 * s, 184 * s, 48 * s);
  ctx.fillStyle = "#a8201a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = (3 * s) + "px";
  ctx.font = Math.round(word.length > 6 ? 26 * s : 32 * s) + "px Rye, serif";
  ctx.fillText(word, 0, 1 * s);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

export function drawWantedPoster(ctx, opts) {
  const cx = opts.cx;
  const cy = opts.cy;
  const w = opts.w;
  const tilt = opts.tilt || 0;
  const s = w / 250;
  const h = w * POSTER_RATIO;
  const top = -h / 2;
  const left = -w / 2;
  const valid = opts.valid || function () { return true; };
  const onReady = opts.onReady || function () {};
  const style = posterStyleOf(opts.acc);
  let inkMain = "#3a2410";
  let inkSub = "#6b4c26";
  const tone = INK_TONES[style.ink];
  if (tone !== undefined) {
    inkMain = tone.main;
    inkSub = tone.sub;
  }

  if (opts.rank) {
    ctx.save();
    ctx.fillStyle = "#8a2f1d";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold " + Math.round(24 * s) + "px Rye, serif";
    ctx.fillText("#" + opts.rank, cx, cy + top - 10 * s);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const grad = ctx.createLinearGradient(-43 * s, -202.4 * s, 43 * s, 202.4 * s);
  grad.addColorStop(0, "#e8d6a8");
  grad.addColorStop(0.48, "#dcc494");
  grad.addColorStop(1, "#c9ae7c");
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, w, h);
  ctx.clip();
  ctx.shadowColor = "rgba(90, 64, 32, 0.4)";
  ctx.shadowBlur = 40 * s;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 8 * s;
  ctx.strokeRect(left - 8 * s, top - 8 * s, w + 16 * s, h + 16 * s);
  ctx.restore();

  ctx.strokeStyle = "#43290f";
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(left + 1.5 * s, top + 1.5 * s, w - 3 * s, h - 3 * s);

  const nail = ctx.createRadialGradient(-1.1 * s, top + 10.6 * s, 0.5 * s, 0, top + 12.5 * s, 5.5 * s);
  nail.addColorStop(0, "#6b6257");
  nail.addColorStop(0.7, "#241a10");
  nail.addColorStop(1, "#241a10");
  ctx.fillStyle = nail;
  ctx.beginPath();
  ctx.arc(0, top + 12.5 * s, 5.5 * s, 0, Math.PI * 2);
  ctx.fill();

  drawPaperEffect(ctx, style, left, top, w, h, s);

  ctx.fillStyle = inkMain;
  ctx.letterSpacing = (7 * s) + "px";
  ctx.font = Math.round(33 * s) + "px Rye, serif";
  ctx.fillText("WANTED", 0, top + 44 * s);

  ctx.fillStyle = inkSub;
  ctx.letterSpacing = (5 * s) + "px";
  ctx.font = Math.round(11 * s) + "px 'Special Elite', serif";
  ctx.fillText("DEAD OR ALIVE", 0, top + 76.5 * s);
  ctx.letterSpacing = "0px";

  const figSize = 196 * s;
  const figTop = top + 85 * s;

  if (opts.pseudo === undefined || opts.pseudo === null) {
    ctx.strokeStyle = "#8a6a3c";
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(-40 * s, figTop + 24 * s, 80 * s, 88 * s);
    ctx.fillStyle = "#a88c58";
    ctx.font = Math.round(46 * s) + "px Rye, serif";
    ctx.fillText("?", 0, figTop + 70 * s);
    ctx.fillStyle = "#8a6a3c";
    ctx.font = Math.round(20 * s) + "px 'Special Elite', serif";
    ctx.fillText("- - -", 0, top + 301 * s);
    ctx.restore();
    return;
  }

  const name = String(opts.pseudo);
  const long = String(opts.pseudo).length > 12;
  ctx.fillStyle = inkMain;
  ctx.letterSpacing = ((long ? 0.5 : 1) * s) + "px";
  let nameSize = long ? 18 : 27;
  ctx.font = Math.round(nameSize * s) + "px Rye, serif";
  while (ctx.measureText(name).width > w - 28 * s && nameSize > 9) {
    nameSize -= 1;
    ctx.font = Math.round(nameSize * s) + "px Rye, serif";
  }
  ctx.fillText(name, 0, top + 301 * s);

  if (style.nick !== null) {
    ctx.fillStyle = inkMain;
    ctx.letterSpacing = (0.5 * s) + "px";
    ctx.font = "italic " + Math.round(12 * s) + "px 'Special Elite', serif";
    ctx.fillText(style.nick, 0, top + 321 * s);
    ctx.letterSpacing = "0px";
  }

  const title = opts.title !== undefined ? String(opts.title) : String(opts.bounty) + " $";
  ctx.fillStyle = "#8a2f1d";
  ctx.letterSpacing = (2 * s) + "px";
  ctx.font = Math.round(25 * s) + "px Rye, serif";
  ctx.fillText(title, 0, top + 342 * s);
  ctx.letterSpacing = "0px";
  ctx.restore();

  const img = new Image();
  img.onload = function () {
    if (!valid()) {
      return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.filter = "sepia(0.3) contrast(1.03) drop-shadow(0px " + (10 * s) + "px " + (14 * s) + "px rgba(58, 36, 16, 0.45))";
    ctx.drawImage(img, -figSize / 2, figTop, figSize, figSize);
    ctx.filter = "none";
    drawStamp(ctx, style, s, top);
    ctx.restore();
    onReady();
  };
  img.src = opts.figSrc || portraitDataUrl(opts.skin, 340, opts.acc, opts.weapon);
}

export function renderWantedPosterEl(el, opts) {
  if (el === null) {
    return;
  }
  let canvas = el.querySelector("canvas.wanted-cv");
  if (canvas === null) {
    canvas = document.createElement("canvas");
    canvas.className = "wanted-cv";
    el.appendChild(canvas);
  }
  const w = opts.width || el.clientWidth || 250;
  const h = w * POSTER_RATIO;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const seq = (el.__wseq || 0) + 1;
  el.__wseq = seq;
  const full = Object.assign({}, opts);
  full.cx = w / 2;
  full.cy = h / 2;
  full.w = w;
  full.valid = function () { return el.__wseq === seq; };
  drawWantedPoster(ctx, full);
}
