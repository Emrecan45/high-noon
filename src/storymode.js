import { CHAPTERS, SCRIPTS, STORY_PERSONA_BY_ID, storyProgress, completeChapter } from "./story.js";
import { getProfile, playerLevel, playerLevelProgress } from "./account.js";
import { Cinematic } from "./cinematic.js";
import { t } from "./i18n.js";

function el(id) {
  return document.getElementById(id);
}

export function createStoryMode(deps) {
  let activeCine = null;
  let chapterIndex = -1;
  let stepIndex = 0;
  let jrIndex = 0;
  let turning = false;
  let bookAnim = false;
  let openTimer = null;
  let sessionStoryNew = false;

  function jrLevel() {
    const profile = getProfile();
    return profile ? playerLevel(profile.xp) : 1;
  }

  function jrStoryLocked(i) {
    return i > storyProgress();
  }

  function jrLevelLocked(i) {
    return jrLevel() < i + 1;
  }

  function jrLocked(i) {
    return jrStoryLocked(i) || jrLevelLocked(i);
  }

  function jrDone(i) {
    return i < storyProgress();
  }

  function leftHtml(i) {
    const chapter = CHAPTERS[i];
    let html = '<div class="jr-chap">' + t("stChapter", { n: i + 1 }) + "</div>";
    html += '<div class="jr-icon">' + (jrLocked(i) ? "🔒" : chapter.icon) + "</div>";
    html += '<div class="jr-name">' + (jrLocked(i) ? "???" : t(chapter.nameKey)) + "</div>";
    if (jrDone(i)) {
      html += '<div class="jr-stamp">' + t("jrDone") + "</div>";
    }
    return html;
  }

  function rightHtml(i) {
    const chapter = CHAPTERS[i];
    let desc;
    if (jrStoryLocked(i)) {
      desc = t("stLocked");
    } else if (jrLevelLocked(i)) {
      desc = t("jrLevelReq", { n: i + 1 });
    } else {
      desc = t(chapter.descKey);
    }
    let html = '<div class="jr-desc">' + desc + "</div>";
    if (!jrLocked(i)) {
      const isNew = i === storyProgress() && !jrDone(i) && sessionStoryNew;
      html += '<div class="jr-play' + (isNew ? " has-notif" : "") + '">' + (jrDone(i) ? t("stReplay") : t("storyPlay")) + "</div>";
    }
    return html;
  }

  function renderDots() {
    const progress = storyProgress();
    const dots = el("jr-dots");
    dots.innerHTML = "";
    for (let i = 0; i < CHAPTERS.length; i++) {
      const dot = document.createElement("span");
      let cls = "jr-dot";
      if (i === jrIndex) {
        cls += " on";
      } else if (i < progress) {
        cls += " done";
      } else if (jrLocked(i)) {
        cls += " locked";
      }
      dot.className = cls;
      dots.appendChild(dot);
    }
    el("jr-prev").disabled = jrIndex === 0;
    el("jr-next").disabled = jrIndex === CHAPTERS.length - 1;
    const profile = getProfile();
    if (profile !== null) {
      const xpNow = playerLevelProgress(profile.xp);
      el("jr-level").textContent = t("levelShort", { n: jrLevel() }) + " - " + xpNow.current + "/" + xpNow.next + " XP";
    } else {
      el("jr-level").textContent = "";
    }
  }

  function renderJournal() {
    el("jr-inner-left").innerHTML = leftHtml(jrIndex);
    el("jr-inner-right").innerHTML = rightHtml(jrIndex);
    renderDots();
  }

  function turnTo(next) {
    if (next < 0 || next >= CHAPTERS.length || turning || bookAnim) {
      return;
    }
    turning = true;
    deps.audio.uiClick();
    const leaf = el("jr-leaf");
    const forward = next > jrIndex;
    leaf.style.transition = "none";
    if (forward) {
      el("jr-leaf-front").innerHTML = el("jr-inner-right").innerHTML;
      el("jr-leaf-back").innerHTML = leftHtml(next);
      leaf.style.transform = "rotateY(0deg)";
      el("jr-inner-right").innerHTML = rightHtml(next);
    } else {
      el("jr-leaf-back").innerHTML = el("jr-inner-left").innerHTML;
      el("jr-leaf-front").innerHTML = rightHtml(next);
      leaf.style.transform = "rotateY(-180deg)";
      el("jr-inner-left").innerHTML = leftHtml(next);
    }
    leaf.classList.remove("hidden");
    void leaf.offsetWidth;
    leaf.style.transition = "transform 0.35s cubic-bezier(0.42, 0.08, 0.3, 1)";
    leaf.style.transform = forward ? "rotateY(-180deg)" : "rotateY(0deg)";
    setTimeout(function () {
      jrIndex = next;
      if (forward) {
        el("jr-inner-left").innerHTML = leftHtml(next);
      } else {
        el("jr-inner-right").innerHTML = rightHtml(next);
      }
      leaf.classList.add("hidden");
      renderDots();
      turning = false;
    }, 380);
  }

  el("jr-prev").addEventListener("click", function () {
    turnTo(jrIndex - 1);
  });
  el("jr-next").addEventListener("click", function () {
    turnTo(jrIndex + 1);
  });
  el("jr-inner-right").addEventListener("click", function (e) {
    if (e.target.closest(".jr-play") === null) {
      return;
    }
    if (jrLocked(jrIndex) || turning || bookAnim) {
      return;
    }
    deps.audio.uiClick();
    start(jrIndex);
  });

  function resetShelf() {
    const shelf = el("shelf");
    shelf.classList.remove("hidden");
    shelf.classList.remove("dim");
    const ep = el("shelf-ep1");
    ep.classList.remove("lift");
    ep.style.transition = "";
    ep.style.transform = "";
  }

  function storyHasNew() {
    const raw = localStorage.getItem("hn-story-seen");
    const seen = raw === null || raw === "" ? -1 : Number(raw);
    const prog = storyProgress();
    return prog < CHAPTERS.length && prog > (Number.isFinite(seen) ? seen : -1);
  }

  function open() {
    turning = false;
    bookAnim = false;
    el("journal").classList.add("hidden");
    el("story-h2").textContent = t("btnStory");
    el("story-h2").style.opacity = "1";
    el("story-h2").classList.remove("hidden");
    el("story-sub").classList.add("hidden");
    el("btn-story-back").classList.remove("hidden");
    resetShelf();
    el("shelf-ep1").classList.toggle("has-notif", storyHasNew());
    deps.ui.showScreen("screen-story");
  }

  function openBook() {
    sessionStoryNew = storyHasNew();
    jrIndex = Math.min(storyProgress(), CHAPTERS.length - 1);
    try {
      localStorage.setItem("hn-story-seen", String(storyProgress()));
    } catch (e) {}
    el("shelf-ep1").classList.remove("has-notif");
    turning = false;
    bookAnim = true;
    renderJournal();
    el("jr-leaf").classList.add("hidden");
    el("journal").classList.remove("hidden");
    const book = el("jr-book");
    book.classList.remove("opened");
    book.classList.add("snap");
    book.classList.add("closed");
    if (openTimer !== null) {
      clearTimeout(openTimer);
    }
    void book.offsetWidth;
    book.classList.remove("snap");
    el("story-h2").textContent = t("storyTitle");
    el("story-h2").style.opacity = "1";
    el("story-h2").classList.remove("hidden");
    el("story-sub").style.opacity = "1";
    el("story-sub").classList.remove("hidden");
    el("btn-story-back").style.opacity = "1";
    el("btn-story-back").style.pointerEvents = "auto";
    el("btn-story-back").classList.remove("hidden");
    openTimer = setTimeout(function () {
      book.classList.remove("closed");
      openTimer = setTimeout(function () {
        book.classList.add("opened");
        bookAnim = false;
        openTimer = null;
      }, 520);
    }, 50);
  }

  el("shelf-ep1").addEventListener("click", function () {
    if (bookAnim || !el("journal").classList.contains("hidden")) {
      return;
    }
    bookAnim = true;
    deps.audio.uiClick();
    el("story-h2").style.opacity = "0";
    el("btn-story-back").style.opacity = "0";
    el("btn-story-back").style.pointerEvents = "none";
    const book = el("shelf-ep1");
    const rect = book.getBoundingClientRect();
    const visualScale = rect.width / book.offsetWidth;
    
    const bookWidth = Math.min(600, window.innerWidth * 0.86);
    const coverTargetCenter = window.innerWidth / 2 + (bookWidth / 4);
    
    const dx = (coverTargetCenter - (rect.left + rect.width / 2)) / visualScale;
    const dy = (window.innerHeight / 2 - (rect.top + rect.height / 2)) / visualScale;
    const scale = (bookWidth / 2) / book.offsetWidth;
    
    book.classList.add("lift");
    el("shelf").classList.add("dim");
    book.style.transition = "transform 0.6s cubic-bezier(0.4, 0.08, 0.3, 1)";
    book.style.transform = "translate(" + dx + "px, " + dy + "px) scale(" + scale + ")";
    setTimeout(function () {
      el("shelf").classList.add("hidden");
      bookAnim = false;
      openBook();
    }, 620);
  });

  function closeJournal(done) {
    if (bookAnim || turning) {
      return;
    }
    if (el("journal").classList.contains("hidden")) {
      if (done) done();
      return;
    }
    bookAnim = true;
    deps.audio.uiClick();
    
    el("story-h2").style.opacity = "0";
    el("story-sub").style.opacity = "0";
    el("btn-story-back").style.opacity = "0";
    el("btn-story-back").style.pointerEvents = "none";
    
    const book = el("jr-book");
    book.classList.remove("opened");
    book.classList.add("closed");
    if (openTimer !== null) {
      clearTimeout(openTimer);
    }
    openTimer = setTimeout(function () {
      el("journal").classList.add("hidden");
      el("story-sub").classList.add("hidden");
      
      const shelf = el("shelf");
      shelf.classList.remove("hidden");
      
      const ep1 = el("shelf-ep1");
      void ep1.offsetWidth;
      
      ep1.style.transform = "translate(0px, 0px) scale(1)";
      shelf.classList.remove("dim");
      
      setTimeout(function () {
        bookAnim = false;
        openTimer = null;
        resetShelf();
        el("story-h2").textContent = t("btnStory");
        el("story-h2").style.opacity = "1";
        el("btn-story-back").style.opacity = "1";
        el("btn-story-back").style.pointerEvents = "auto";
        el("btn-story-back").classList.remove("hidden");
      }, 620);
    }, 520);
  }

  function ctx() {
    return {
      you: deps.youSpec(),
      stopMusic: function () {
        deps.music.stop();
      }
    };
  }

  function playScript(name, onDone) {
    const keepWalkersOnlyVisible = name === "ch1_intro" && deps.town && typeof deps.town.setWalkersOnlyVisible === "function";
    if (keepWalkersOnlyVisible) {
      deps.town.setWalkersOnlyVisible(true);
    }
    const hideAmbientBarman = name === "ch1_intro";
    if (hideAmbientBarman) {
      deps.arena.interiors.setAmbientVisible("barman", false);
    }
    deps.ui.showScreen(null);
    deps.ui.hudVisible(false);
    if (deps.playerBody) {
      deps.playerBody.group.visible = false;
    }
    if (deps.cowboy) {
      deps.cowboy.group.visible = false;
    }
    const overlay = el("fade-overlay");
    overlay.style.transition = "none";
    overlay.style.opacity = "1";
    void overlay.offsetWidth;
    const data = SCRIPTS[name](ctx());
    activeCine = new Cinematic({
      arena: deps.arena,
      audio: deps.audio,
      music: deps.music,
      actors: data.actors,
      steps: data.steps,
      onDone: function () {
        if (keepWalkersOnlyVisible) {
          deps.town.setWalkersOnlyVisible(false);
        }
        if (hideAmbientBarman) {
          deps.arena.interiors.setAmbientVisible("barman", true);
        }
        activeCine = null;
        onDone();
      },
      onQuit: function () {
        if (hideAmbientBarman) {
          deps.arena.interiors.setAmbientVisible("barman", true);
        }
        activeCine = null;
        abort();
      }
    });
    activeCine.start();
  }

  function start(index) {
    chapterIndex = index;
    stepIndex = 0;
    deps.begin();
    runStep();
  }

  function runStep() {
    const chapter = CHAPTERS[chapterIndex];
    if (stepIndex >= chapter.steps.length) {
      finishChapter();
      return;
    }
    const step = chapter.steps[stepIndex];
    if (step.type === "cine") {
      playScript(step.script, function () {
        stepIndex += 1;
        runStep();
      });
      return;
    }
    if (step.type === "duel") {
      deps.launchDuel({
        persona: STORY_PERSONA_BY_ID[step.persona],
        personaId: step.persona,
        modifier: step.modifier,
        perks: step.perks || null,
        onEnd: function (won) {
          if (won) {
            stepIndex += 1;
            runStep();
          } else {
            playScript(step.loseScript, function () {
              runStep();
            });
          }
        }
      });
      return;
    }
    if (step.type === "minigame") {
      deps.launchMinigame({
        mode: step.mode,
        onEnd: function (won, reason) {
          if (won) {
            stepIndex += 1;
            runStep();
          } else {
            let script = step.loseScript;
            if (reason === "hostage" && step.loseScriptHostage !== undefined) {
              script = step.loseScriptHostage;
            }
            playScript(script, function () {
              runStep();
            });
          }
        }
      });
    }
  }

  function finishChapter() {
    const index = chapterIndex;
    chapterIndex = -1;
    const replayed = index < storyProgress();
    completeChapter(index);
    deps.onChapterDone(index, index === CHAPTERS.length - 1, replayed);
  }

  function abort() {
    chapterIndex = -1;
    if (activeCine !== null) {
      activeCine.dispose();
      activeCine = null;
    }
    deps.exitToMenu();
  }

  function update(dt) {
    if (activeCine !== null) {
      activeCine.update(dt);
    }
  }

  function isActive() {
    return chapterIndex !== -1;
  }

  return {
    open: open,
    closeJournal: closeJournal,
    start: start,
    abort: abort,
    update: update,
    isActive: isActive,
    renderList: renderJournal
  };
}
