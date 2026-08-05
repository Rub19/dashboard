import { element, icon } from "./dom.mjs";

export function mountFocusIsland(host, options = {}) {
  const focusTimer = options.focusTimer;
  if (!focusTimer) return null;

  const island = element("div", { className: "v8-dynamic-island" }, [
    element("div", { className: "v8-dynamic-island__content" }, [
      element("div", { className: "v8-dynamic-island__timer" }, [
        element("span", { className: "v8-dynamic-island__time" }, [document.createTextNode("00:00")]),
        element("span", { className: "v8-dynamic-island__phase" }, [document.createTextNode("Focus")])
      ]),
      element("div", { className: "v8-dynamic-island__actions" }, [
        element("button", { className: "v8-icon-button", dataset: { action: "focus-pause" } }, [icon("pause")]),
        element("button", { className: "v8-icon-button", dataset: { action: "focus-stop" } }, [icon("square")])
      ])
    ])
  ]);

  host.appendChild(island);

  let lastPhase = "idle";
  
  function updateUI(state) {
    const timeNode = island.querySelector(".v8-dynamic-island__time");
    const phaseNode = island.querySelector(".v8-dynamic-island__phase");
    let playBtn = island.querySelector("[data-action=focus-pause]");
    
    if (state.phase === "idle") {
      island.classList.remove("is-active");
    } else {
      island.classList.add("is-active");
      timeNode.textContent = focusTimer.formatRemaining();
      
      const phaseLabels = { focus: "Focus", shortBreak: "Pause Courte", longBreak: "Pause Longue" };
      phaseNode.textContent = phaseLabels[state.phase] || "Focus";
      
      if (state.paused) {
        island.classList.add("is-paused");
        if (playBtn) playBtn.replaceChildren(icon("play"));
      } else {
        island.classList.remove("is-paused");
        if (playBtn) playBtn.replaceChildren(icon("pause"));
      }
    }
    lastPhase = state.phase;
  }

  island.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    
    if (action === "focus-pause") {
      if (focusTimer.getState().paused) focusTimer.resume();
      else focusTimer.pause();
    } else if (action === "focus-stop") {
      focusTimer.stop();
    }
  });

  const unsubscribe = focusTimer.subscribe((state) => updateUI(state));
  updateUI(focusTimer.getState());

  return {
    destroy() {
      unsubscribe();
      island.remove();
    }
  };
}
