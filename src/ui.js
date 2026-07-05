function el(id) {
  return document.getElementById(id);
}

export function createUi() {
  const screens = [
    "screen-title",
    "screen-opponents",
    "screen-help",
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

  function setHearts(count) {
    let text = "";
    for (let i = 0; i < count; i++) {
      text += "♥ ";
    }
    el("hearts").textContent = text.trim();
  }

  function setDodges(count) {
    let text = "";
    for (let i = 0; i < count; i++) {
      text += "◆ ";
    }
    el("dodges").textContent = ("ESQUIVE " + text).trim();
    if (count === 0) {
      el("dodges").textContent = "";
    }
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

  function roundEnd(title, detail, times, cb) {
    el("roundend-title").textContent = title;
    el("roundend-detail").textContent = detail;
    el("roundend-times").innerHTML = times;
    showScreen("screen-roundend");
    const btn = el("btn-roundend-next");
    btn.onclick = function () {
      hideScreens();
      cb();
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
        '<div class="card-name">' + perk.name + "</div>" +
        '<div class="card-desc">' + perk.desc + "</div>";
      card.onclick = function () {
        hideScreens();
        cb(perk.id);
      };
      container.appendChild(card);
    }
    showScreen("screen-perk");
  }

  function matchEnd(title, detail, onRematch, onMenu) {
    el("matchend-title").textContent = title;
    el("matchend-detail").textContent = detail;
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
        '<div class="card-desc">' + persona.desc + "</div>";
      card.onclick = function () {
        cb(persona);
      };
      container.appendChild(card);
    }
  }

  function searchTick(seconds, showFallback) {
    el("search-timer").textContent = seconds + " s";
    if (showFallback) {
      el("search-hint").classList.remove("hidden");
      el("btn-search-ai").classList.remove("hidden");
    } else {
      el("search-hint").classList.add("hidden");
      el("btn-search-ai").classList.add("hidden");
    }
  }

  return {
    showScreen: showScreen,
    hideScreens: hideScreens,
    hudVisible: hudVisible,
    setBig: setBig,
    setSub: setSub,
    setScore: setScore,
    setRoundLabel: setRoundLabel,
    setHearts: setHearts,
    setDodges: setDodges,
    setGunState: setGunState,
    crosshair: crosshair,
    hitFlash: hitFlash,
    touchControls: touchControls,
    roundEnd: roundEnd,
    perkChoice: perkChoice,
    matchEnd: matchEnd,
    opponentCards: opponentCards,
    searchTick: searchTick
  };
}
