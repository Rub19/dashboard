import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";

const PRESETS = Object.freeze([
  { id: "pomodoro", label: "Pomodoro", icon: "timer", action: "v8.focus.start.pomodoro" },
  { id: "deep", label: "Deep Work", icon: "brain", action: "v8.focus.start.deep" },
  { id: "quick", label: "Sprint", icon: "zap", action: "v8.focus.start.quick" }
]);

const PHASE_LABELS = Object.freeze({
  idle: "Prêt",
  work: "Focus",
  break: "Pause Courte",
  longbreak: "Pause Longue",
  paused: "En pause"
});

export function attachFocusPopover(trigger, options = {}) {
  const focusTimer = options.focusTimer;
  const onAction = options.onAction;
  if (!trigger || !onAction || typeof document === "undefined") return null;

  let hideTimeout = null;

  const phaseLabel = element("span", { className: "v8-focus-popover__phase", text: "Prêt" });
  const timeLabel = element("span", { className: "v8-focus-popover__time", text: "" });

  function menuItem(label, iconName, action) {
    return element("button", {
      className: "v8-focus-popover__item",
      attributes: { type: "button" },
      dataset: { focusAction: action }
    }, [icon(iconName), element("span", { text: label })]);
  }

  function toggleButton(label, iconName, action) {
    return menuItem(label, iconName, action);
  }

  const startGroup = element("div", { className: "v8-focus-popover__group" }, [
    element("span", { className: "v8-focus-popover__group-label", text: "Démarrer" }),
    ...PRESETS.map((preset) => menuItem(preset.label, preset.icon, preset.action))
  ]);

  const pauseBtn = toggleButton("Pause", "pause", "v8.focus.pause");
  const controls = element("div", { className: "v8-focus-popover__group" }, [
    element("span", { className: "v8-focus-popover__group-label", text: "Contrôles" }),
    pauseBtn,
    menuItem("Arrêter", "square", "v8.focus.stop"),
    menuItem("Passer", "skip-forward", "v8.focus.skip")
  ]);

  const popover = element("div", { className: "v8-focus-popover", attributes: { hidden: true, role: "menu", "aria-label": "Focus Timer" } }, [
    element("header", { className: "v8-focus-popover__header" }, [
      element("strong", { text: "Focus Timer" }),
      phaseLabel
    ]),
    element("div", { className: "v8-focus-popover__body" }, [startGroup, controls])
  ]);

  function show() {
    if (hideTimeout) clearTimeout(hideTimeout);
    const rect = trigger.getBoundingClientRect();
    const isTop = trigger.classList?.contains("v8-focus-status") || rect.top > window.innerHeight - 120;
    const isRight = rect.left > window.innerWidth / 2;
    popover.hidden = false;
    popover.style.position = "fixed";
    popover.style.zIndex = "10000";
    if (isTop) {
      popover.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    } else {
      popover.style.top = `${rect.bottom + 10}px`;
    }
    if (isRight) {
      popover.style.right = `${window.innerWidth - rect.right}px`;
      popover.style.left = "auto";
    } else {
      popover.style.left = `${rect.left}px`;
      popover.style.right = "auto";
    }
    refreshIcons?.();
  }

  function hide() {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      popover.hidden = true;
    }, 180);
  }

  function cancelHide() {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  function updateState(state) {
    const phase = state.phase || "idle";
    phaseLabel.textContent = `${PHASE_LABELS[phase] || "Focus"}${state.paused ? " — Pause" : ""}`;
    if (phase === "idle") {
      timeLabel.textContent = "";
    } else {
      timeLabel.textContent = focusTimer?.formatRemaining?.(state.remaining) || "";
    }
    pauseBtn.querySelector("span").textContent = state.paused ? "Reprendre" : "Pause";
    const pauseIcon = pauseBtn.querySelector("i");
    if (pauseIcon) pauseIcon.setAttribute("data-lucide", state.paused ? "play" : "pause");
    refreshIcons();
  }

  trigger.addEventListener("mouseenter", show);
  trigger.addEventListener("mouseleave", hide);
  trigger.addEventListener("focus", show);
  trigger.addEventListener("blur", hide);
  popover.addEventListener("mouseenter", cancelHide);
  popover.addEventListener("mouseleave", hide);
  popover.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-focus-action]");
    if (!btn) return;
    const action = btn.dataset.focusAction;
    if (action === "v8.focus.pause") {
      const state = focusTimer?.getState?.() || { phase: "idle", paused: false };
      onAction(state.paused ? "v8.focus.resume" : "v8.focus.pause", { source: "focus-popover" });
    } else {
      onAction(action, { source: "focus-popover" });
    }
    popover.hidden = true;
  });

  let unsubscribe;
  if (focusTimer?.subscribe) {
    unsubscribe = focusTimer.subscribe(updateState);
    updateState(focusTimer.getState());
  }

  document.body.appendChild(popover);

  return {
    destroy() {
      cancelHide();
      unsubscribe?.();
      popover.remove();
    }
  };
}
