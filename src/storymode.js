import { CHAPTERS, SCRIPTS, STORY_PERSONA_BY_ID, storyProgress, completeChapter } from "./story.js";
import { Cinematic } from "./cinematic.js";
import { t } from "./i18n.js";

function el(id) {
  return document.getElementById(id);
}

export function createStoryMode(deps) {
  let activeCine = null;
  let chapterIndex = -1;
  let stepIndex = 0;

  function renderList() {
    const list = el("story-list");
    list.innerHTML = "";
    const progress = storyProgress();
    for (let i = 0; i < CHAPTERS.length; i++) {
      const chapter = CHAPTERS[i];
      const card = document.createElement("div");
      card.className = "story-card";
      let state = "locked";
      if (i < progress) {
        state = "done";
      } else if (i === progress) {
        state = "next";
      }
      card.classList.add(state);
      const chap = document.createElement("div");
      chap.className = "sc-chap";
      chap.textContent = t("stChapter", { n: i + 1 });
      card.appendChild(chap);
      const icon = document.createElement("div");
      icon.className = "sc-icon";
      icon.textContent = state === "locked" ? "🔒" : chapter.icon;
      card.appendChild(icon);
      const name = document.createElement("div");
      name.className = "sc-name";
      name.textContent = state === "locked" ? "???" : t(chapter.nameKey);
      card.appendChild(name);
      const desc = document.createElement("div");
      desc.className = "sc-desc";
      desc.textContent = state === "locked" ? t("stLocked") : t(chapter.descKey);
      card.appendChild(desc);
      const stateLabel = document.createElement("div");
      stateLabel.className = "sc-state";
      if (state === "next") {
        stateLabel.textContent = t("storyPlay");
      } else if (state === "done") {
        stateLabel.textContent = t("stReplay");
      } else {
        stateLabel.textContent = "";
      }
      card.appendChild(stateLabel);
      if (state !== "locked") {
        card.addEventListener("click", function () {
          deps.audio.uiClick();
          start(i);
        });
      }
      list.appendChild(card);
    }
  }

  function open() {
    renderList();
    deps.ui.showScreen("screen-story");
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
    deps.ui.showScreen(null);
    deps.ui.hudVisible(false);
    if (deps.playerBody) {
      deps.playerBody.group.visible = false;
    }
    if (deps.cowboy) {
      deps.cowboy.group.visible = false;
    }
    const data = SCRIPTS[name](ctx());
    activeCine = new Cinematic({
      arena: deps.arena,
      audio: deps.audio,
      music: deps.music,
      actors: data.actors,
      steps: data.steps,
      onDone: function () {
        activeCine = null;
        onDone();
      },
      onQuit: function () {
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
        distance: step.distance,
        perks: step.perks || null,
        tutorial: step.tutorial === true,
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
    completeChapter(index);
    deps.onChapterDone(index, index === CHAPTERS.length - 1);
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
    start: start,
    abort: abort,
    update: update,
    isActive: isActive,
    renderList: renderList
  };
}
