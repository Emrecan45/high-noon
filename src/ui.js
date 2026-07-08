import { t } from "./i18n.js";

function el(id) {
  return document.getElementById(id);
}

export function createUi() {
  const screens = [
    "screen-title",
    "screen-opponents",
    "screen-help",
    "screen-profile",
    "screen-inventory",
    "screen-shop",
    "screen-patch",
    "screen-board",
    "screen-search",
    "screen-roundend",
    "screen-perk",
    "screen-matchend",
    "lock-prompt"
  ];

  let bigTimer = null;

  function showScreen(id) {
    for (const name of screens) {
      const node = el(name);
      if (name === id) {
        node.classList.remove("hidden");
      } else {
        node.classList.add("hidden");
      }
    }
  }

  function hideScreens() {
    showScreen(null);
  }

  function hudVisible(visible) {
    if (visible) {
      el("hud").classList.remove("hidden");
    } else {
      el("hud").classList.add("hidden");
    }
  }

  function setBig(text, cls, autohideMs) {
    const node = el("bigmsg");
    if (bigTimer !== null) {
      clearTimeout(bigTimer);
      bigTimer = null;
    }
    if (text === "") {
      node.classList.add("hidden");
      return;
    }
    node.textContent = text;
    node.className = "";
    if (cls) {
      node.classList.add(cls);
    }
    if (autohideMs) {
      bigTimer = setTimeout(function () {
        node.classList.add("hidden");
      }, autohideMs);
    }
  }

  function setSub(text) {
    const node = el("submsg");
    if (text === "") {
      node.classList.add("hidden");
    } else {
      node.textContent = text;
      node.classList.remove("hidden");
    }
  }

  function setScore(you, opp) {
    el("score-you").textContent = String(you);
    el("score-opp").textContent = String(opp);
  }

  function setRoundLabel(text) {
    el("round-label").textContent = text;
  }

  function setOppTag(text) {
    el("opp-tag").textContent = text;
  }

  function setHearts(count) {
    let hearts = "";
    for (let i = 0; i < count; i++) {
      hearts += "♥ ";
    }
    el("hearts").innerHTML =
      '<span class="hp-label">' + t("hpLabel") + "</span> " + hearts.trim();
  }

  function setDodges(count) {
    if (count === 0) {
      el("dodges").innerHTML = "";
      return;
    }
    let diamonds = "";
    for (let i = 0; i < count; i++) {
      diamonds += "◆ ";
    }
    el("dodges").innerHTML =
      '<span class="dodge-label">' + t("dodgeLabel") + "</span> " + diamonds.trim() +
      ' <span class="key-hint"><kbd>Q</kbd><kbd>D</kbd></span>';
  }

  function setGunState(text) {
    el("gunstate").textContent = text;
  }

  function crosshair(visible) {
    if (visible) {
      el("crosshair").classList.remove("hidden");
    } else {
      el("crosshair").classList.add("hidden");
    }
  }

  function moveCrosshair(nx, ny) {
    const node = el("crosshair");
    node.style.left = ((0.5 + nx / 2) * 100) + "%";
    node.style.top = ((0.5 - ny / 2) * 100) + "%";
  }

  function setGlare(value) {
    const node = el("glare");
    node.style.opacity = String(value);
    node.style.setProperty("--gi", String(value));
  }

  function setGlarePos(xPercent, yPercent, rotDeg) {
    const node = el("glare");
    node.style.setProperty("--gx", xPercent + "%");
    node.style.setProperty("--gy", yPercent + "%");
    node.style.setProperty("--gr", rotDeg + "deg");
  }

  function hitFlash() {
    const node = el("hitflash");
    node.classList.add("active");
    setTimeout(function () {
      node.classList.remove("active");
    }, 120);
  }

  function touchControls(visible) {
    if (visible) {
      el("touch-controls").classList.remove("hidden");
    } else {
      el("touch-controls").classList.add("hidden");
    }
  }

  function roundEnd(title, detail, times, cb, onQuit) {
    el("roundend-title").textContent = title;
    el("roundend-detail").textContent = detail;
    el("roundend-times").innerHTML = times;
    showScreen("screen-roundend");
    el("btn-roundend-next").onclick = function () {
      hideScreens();
      cb();
    };
    el("btn-roundend-quit").onclick = function () {
      hideScreens();
      onQuit();
    };
  }

  function perkChoice(perks, cb) {
    const container = el("perk-cards");
    container.innerHTML = "";
    for (const perk of perks) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<div class="card-icon">' + perk.icon + "</div>" +
        '<div class="card-name">' + t(perk.nameKey) + "</div>" +
        '<div class="card-desc">' + t(perk.descKey) + "</div>";
      card.onclick = function () {
        hideScreens();
        cb(perk.id);
      };
      container.appendChild(card);
    }
    showScreen("screen-perk");
  }

  function recapRow(container, label, value) {
    const l = document.createElement("span");
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "stat-value";
    v.textContent = value;
    container.appendChild(l);
    container.appendChild(v);
  }

  function fillRecap(stats) {
    const recap = el("matchend-recap");
    recap.innerHTML = "";
    if (!stats) {
      recap.classList.add("hidden");
      return;
    }
    let acc = "-";
    if (stats.shots > 0) {
      acc = Math.round((stats.hits / stats.shots) * 100) + "%";
    }
    recapRow(recap, t("statsAccuracy"), acc);
    recapRow(recap, t("meShots"), String(stats.shots));
    recapRow(recap, t("statsHead"), String(stats.heads));
    recap.classList.remove("hidden");
  }

  function matchEnd(title, detail, onRematch, onMenu) {
    el("matchend-title").textContent = title;
    const node = el("matchend-detail");
    node.innerHTML = "";
    if (typeof detail === "string") {
      node.textContent = detail;
      fillRecap(null);
    } else {
      const flavor = document.createElement("div");
      flavor.className = "me-flavor";
      flavor.textContent = detail.flavor;
      const score = document.createElement("div");
      score.className = "me-score";
      score.textContent = detail.score;
      const reward = document.createElement("div");
      reward.className = "me-reward hidden";
      reward.id = "matchend-reward";
      node.appendChild(flavor);
      node.appendChild(score);
      node.appendChild(reward);
      fillRecap(detail.stats);
    }
    showScreen("screen-matchend");
    el("btn-rematch").onclick = function () {
      hideScreens();
      onRematch();
    };
    el("btn-menu").onclick = function () {
      onMenu();
    };
  }

  function opponentCards(personas, cb) {
    const container = el("opponent-cards");
    container.innerHTML = "";
    for (const persona of personas) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<div class="card-icon">' + persona.icon + "</div>" +
        '<div class="card-name">' + persona.name + "</div>" +
        '<div class="card-desc">' + t(persona.descKey) + "</div>";
      card.onclick = function () {
        cb(persona);
      };
      container.appendChild(card);
    }
  }

  function searchTick(seconds) {
    el("search-timer").textContent = seconds + " s";
  }

  function announce(title, name, ms, onDone) {
    el("announce-title").textContent = title;
    el("announce-name").textContent = name;
    el("screen-announce").classList.remove("hidden");
    const node = el("screen-announce");
    node.classList.remove("show");
    void node.offsetWidth;
    node.classList.add("show");
    setTimeout(function () {
      node.classList.remove("show");
      setTimeout(function () {
        node.classList.add("hidden");
      }, 500);
      onDone();
    }, ms);
  }

  function duelIntro(info, ms, onDone) {
    el("di-you-name").textContent = info.you.name;
    el("di-you-title").textContent = info.you.title;
    el("di-you-fig").src = info.you.portrait;
    el("di-opp-name").textContent = info.opp.name;
    el("di-opp-title").textContent = info.opp.title;
    el("di-opp-fig").src = info.opp.portrait;
    const node = el("screen-duelintro");
    node.classList.remove("hidden");
    node.classList.remove("show");
    void node.offsetWidth;
    node.classList.add("show");
    setTimeout(function () {
      node.classList.add("hidden");
      node.classList.remove("show");
      onDone();
    }, ms);
  }

  return {
    showScreen: showScreen,
    hideScreens: hideScreens,
    hudVisible: hudVisible,
    setBig: setBig,
    setSub: setSub,
    setScore: setScore,
    setRoundLabel: setRoundLabel,
    setOppTag: setOppTag,
    setHearts: setHearts,
    setDodges: setDodges,
    setGunState: setGunState,
    crosshair: crosshair,
    moveCrosshair: moveCrosshair,
    setGlare: setGlare,
    setGlarePos: setGlarePos,
    hitFlash: hitFlash,
    touchControls: touchControls,
    roundEnd: roundEnd,
    perkChoice: perkChoice,
    matchEnd: matchEnd,
    opponentCards: opponentCards,
    searchTick: searchTick,
    announce: announce,
    duelIntro: duelIntro
  };
}
