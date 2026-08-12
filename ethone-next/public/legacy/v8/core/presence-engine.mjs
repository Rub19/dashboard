const BRAIN_STATES = new Set(["idle", "ready", "thinking", "responding", "error"]);
const SYNC_STATES = new Set(["idle", "syncing", "local", "error"]);
const MEDIA_STATES = new Set(["idle", "paused", "playing"]);
const CALENDAR_STATES = new Set(["idle", "approaching"]);
const MAIL_STATES = new Set(["idle", "new"]);
const ICON_KINDS = new Set(["brain", "calendar", "mail", "notifications"]);
const LIVE_KINDS = new Set(["brain", "clock", "media", "metric", "planning", "signal", "widget", "profile", "text"]);
const ACTIVITY_KINDS = new Set(["notification", "task", "note", "widget", "calendar", "file", "system"]);
const ACTIVITY_PHASES = new Set(["enter", "update", "exit", "complete"]);

function normalizedSync(value) {
  if (["online", "saved"].includes(value)) return "idle";
  if (["loading", "saving", "retrying"].includes(value)) return "syncing";
  if (["offline", "expired"].includes(value)) return "error";
  return SYNC_STATES.has(value) ? value : "idle";
}

export function calendarPresenceState(events = [], now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) return "idle";
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const approaching = (Array.isArray(events) ? events : []).some((event) => {
    const match = String(event?.date || event?.start || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const eventDate = new Date(year, month, day);
    if (eventDate.getFullYear() !== year || eventDate.getMonth() !== month || eventDate.getDate() !== day) return false;
    const delta = Math.round((eventDate.getTime() - today) / dayMs);
    return delta >= 0 && delta <= 1;
  });
  return approaching ? "approaching" : "idle";
}

export function normalizePresenceState(input = {}) {
  return Object.freeze({
    brain: BRAIN_STATES.has(input.brain) ? input.brain : "ready",
    sync: normalizedSync(input.sync || input.syncStatus),
    media: MEDIA_STATES.has(input.media) ? input.media : "idle",
    calendar: CALENDAR_STATES.has(input.calendar) ? input.calendar : "idle",
    mail: MAIL_STATES.has(input.mail) ? input.mail : "idle",
    notifications: Math.min(99, Math.max(0, Number.parseInt(input.notifications, 10) || 0)),
    notificationsImportant: Math.min(99, Math.max(0, Number.parseInt(input.notificationsImportant, 10) || 0)),
    route: /^[a-z0-9-]{1,32}$/.test(String(input.route || "entry")) ? String(input.route || "entry") : "entry"
  });
}

export function createPresenceEngine(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  const target = options.target || documentRef?.documentElement;
  const reducedMotion = runtime.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let state = normalizePresenceState(options.initialState);
  let started = false;
  let destroyed = false;
  let responseTimer = 0;
  let mailTimer = 0;
  const liveAnimations = new Map();

  function mergeState(patch = {}) {
    const nextState = { ...state, ...patch };
    if (Object.hasOwn(patch, "syncStatus") && !Object.hasOwn(patch, "sync")) {
      nextState.sync = patch.syncStatus;
    }
    return normalizePresenceState(nextState);
  }

  function isActive() {
    return started && !destroyed && documentRef?.hidden !== true && reducedMotion?.matches !== true;
  }

  function cancelLiveAnimation(node) {
    const record = liveAnimations.get(node);
    if (!record) return false;
    try { record.animation.cancel?.(); } catch {}
    record.settle(false);
    return true;
  }

  function runMotion(node, motion, config = {}) {
    if (!node || destroyed) {
      config.onComplete?.();
      return false;
    }
    cancelLiveAnimation(node);
    if (!isActive() || typeof node.animate !== "function") {
      config.onComplete?.();
      return false;
    }

    if (config.marker === "activity") {
      node.dataset.presenceActivity = config.kind;
      node.dataset.presencePhase = config.phase;
    } else {
      node.dataset.presenceUpdate = config.kind;
    }

    let animation;
    try {
      animation = node.animate(motion.frames, {
        duration: Math.min(config.maxDuration || 420, Math.max(120, Number(config.duration) || motion.duration)),
        delay: Math.min(160, Math.max(0, Number(config.delay) || 0)),
        easing: String(config.easing || motion.easing || "cubic-bezier(.22, 1, .36, 1)"),
        fill: "both"
      });
    } catch {
      if (node?.dataset) {
        delete node.dataset.presenceUpdate;
        delete node.dataset.presenceActivity;
        delete node.dataset.presencePhase;
      }
      config.onComplete?.();
      return false;
    }

    const record = { animation, settled: false, marker: config.marker || "update", onComplete: config.onComplete || null };
    record.settle = (releaseEffect = true) => {
      if (record.settled) return;
      record.settled = true;
      if (liveAnimations.get(node) === record) liveAnimations.delete(node);
      if (node?.dataset) {
        if (record.marker === "activity") {
          delete node.dataset.presenceActivity;
          delete node.dataset.presencePhase;
        } else {
          delete node.dataset.presenceUpdate;
        }
      }
      if (releaseEffect) {
        try { record.animation.cancel?.(); } catch {}
      }
      try { record.onComplete?.(); } catch {}
    };
    liveAnimations.set(node, record);
    animation.finished?.then?.(() => record.settle(true), () => record.settle(false));
    return true;
  }

  function liveMotion(kind) {
    if (kind === "clock") return Object.freeze({ duration: 180, frames: [{ opacity: 0.5, transform: "translate3d(0, 3px, 0)" }, { opacity: 1, transform: "translate3d(0, 0, 0)" }] });
    if (kind === "media") return Object.freeze({ duration: 240, frames: [{ opacity: 0.58, transform: "translate3d(0, 2px, 0) scale(0.985)" }, { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }] });
    if (kind === "brain") return Object.freeze({ duration: 260, frames: [{ opacity: 0.54, transform: "translate3d(0, 4px, 0) scale(0.992)" }, { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }] });
    if (kind === "profile") return Object.freeze({ duration: 210, frames: [{ opacity: 0.76, transform: "translate3d(0, 6px, 0) scale(0.994)" }, { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }] });
    return Object.freeze({ duration: 220, frames: [{ opacity: 0.62, transform: "translate3d(0, 4px, 0)" }, { opacity: 1, transform: "translate3d(0, 0, 0)" }] });
  }

  function activityMotion(kind, phase) {
    if (phase === "exit") {
      return Object.freeze({
        duration: kind === "notification" ? 200 : 180,
        easing: "cubic-bezier(.4, 0, 1, 1)",
        frames: [
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          { opacity: 0, transform: `translate3d(${kind === "notification" ? "10px, 0" : "0, -5px"}, 0) scale(0.985)` }
        ]
      });
    }
    if (phase === "complete") {
      return Object.freeze({
        duration: 460,
        easing: "cubic-bezier(.4, 0, .2, 1)",
        frames: [
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          { opacity: 1, transform: "translate3d(0, -2px, 0) scale(1.01)", offset: 0.15 },
          { opacity: 0.86, transform: "translate3d(0, -12px, 0) scale(0.97)", offset: 0.55 },
          { opacity: 0, transform: "translate3d(0, -24px, 0) scale(0.92)" }
        ]
      });
    }
    if (phase === "update") {
      return Object.freeze({
        duration: 190,
        frames: [
          { opacity: 0.76, transform: "translate3d(0, 2px, 0) scale(0.994)" },
          { opacity: 1, transform: "translate3d(0, -0.5px, 0) scale(1.004)" },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
        ]
      });
    }
    const offset = kind === "notification" ? "12px, 0" : kind === "note" ? "0, 7px" : "0, 8px";
    const scale = kind === "widget" ? 0.976 : 0.988;
    return Object.freeze({
      duration: kind === "notification" ? 240 : 220,
      frames: [
        { opacity: 0, transform: `translate3d(${offset}, 0) scale(${scale})` },
        { opacity: 1, transform: "translate3d(0, -0.75px, 0) scale(1.003)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
      ]
    });
  }

  function iconMotion(kind) {
    if (kind === "brain") return Object.freeze({ duration: 360, frames: [{ opacity: 0.86, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.075)" }, { opacity: 0.92, transform: "scale(1)" }] });
    if (kind === "calendar") return Object.freeze({ duration: 280, frames: [{ opacity: 0.82, transform: "translate3d(0, 0, 0) scale(1)" }, { opacity: 1, transform: "translate3d(0, -2px, 0) scale(1.055)" }, { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }] });
    if (kind === "mail") return Object.freeze({ duration: 260, frames: [{ opacity: 0.55, transform: "translate3d(3px, 0, 0) scale(0.92)" }, { opacity: 1, transform: "translate3d(-0.5px, 0, 0) scale(1.045)" }, { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }] });
    return Object.freeze({ duration: 300, frames: [{ opacity: 0.82, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.08)" }, { opacity: 1, transform: "scale(1)" }] });
  }

  function transitionSurface(node, config = {}) {
    if (!node || destroyed) return false;
    const kind = LIVE_KINDS.has(config.kind) ? config.kind : "widget";
    const motion = liveMotion(kind);
    return runMotion(node, motion, { ...config, kind, marker: "update", maxDuration: 420 });
  }

  function signalActivity(node, kind = "system", config = {}) {
    const activityKind = ACTIVITY_KINDS.has(kind) ? kind : "system";
    const phase = ACTIVITY_PHASES.has(config.phase) ? config.phase : "enter";
    const motion = activityMotion(activityKind, phase);
    return runMotion(node, motion, {
      ...config,
      kind: activityKind,
      phase,
      marker: "activity",
      maxDuration: phase === "complete" ? 700 : 250
    });
  }

  function signalIcon(kind, config = {}) {
    const iconKind = ICON_KINDS.has(kind) ? kind : "";
    if (!iconKind || destroyed) return 0;
    const motion = iconMotion(iconKind);
    let signaled = 0;
    documentRef?.querySelectorAll?.(`[data-presence-icon="${iconKind}"]`).forEach((node, index) => {
      const ran = runMotion(node, motion, {
        ...config,
        delay: Math.min(48, index * 12),
        duration: config.duration || motion.duration,
        kind: iconKind,
        marker: "update",
        maxDuration: 420
      });
      if (ran) signaled += 1;
    });
    return signaled;
  }

  function transitionText(node, value, config = {}) {
    if (!node || destroyed) return false;
    const nextValue = String(value ?? "");
    if (node.textContent === nextValue) return false;
    const hadContent = Boolean(node.textContent);
    node.textContent = nextValue;
    if (!hadContent && config.animateInitial !== true) return true;
    transitionSurface(node, { ...config, kind: config.kind || "text" });
    return true;
  }

  function revealWidgets(root = documentRef) {
    if (!root || destroyed) return 0;
    const widgets = [];
    if (root.matches?.("[data-live-widget], [data-live-number]")) widgets.push(root);
    root.querySelectorAll?.("[data-live-widget], [data-live-number]").forEach((widget) => widgets.push(widget));
    const numberColors = new Map();
    widgets.forEach((widget) => {
      if (widget.dataset.liveNumber == null) return;
      const color = runtime.getComputedStyle?.(widget)?.color;
      if (color) numberColors.set(widget, color);
    });
    let revealed = 0;
    widgets.forEach((widget) => {
      if (widget.dataset.presenceLive) return;
      const index = Math.min(7, revealed);
      widget.dataset.presenceLive = "enter";
      widget.style?.setProperty?.("--v8-live-index", String(index));
      if (widget.dataset.liveNumber != null) {
        const value = Math.min(9999, Math.max(0, Number.parseInt(widget.dataset.liveNumber, 10) || 0));
        widget.style?.setProperty?.("--v8-live-number-to", String(value));
        if (numberColors.has(widget)) widget.style?.setProperty?.("--v8-live-number-color", numberColors.get(widget));
      }
      revealed += 1;
    });
    return revealed;
  }

  function renderNotificationBadges() {
    const unread = state.notifications;
    documentRef?.querySelectorAll?.("[data-presence-notification-badge]").forEach((badge) => {
      badge.hidden = unread === 0;
      badge.textContent = unread > 9 ? "9+" : String(unread);
      const button = badge.closest?.("button");
      const mail = state.mail === "new" ? " Nouvel e-mail." : "";
      const important = state.notificationsImportant ? " Notification importante." : "";
      button?.setAttribute?.("aria-label", `${unread ? `Ouvrir les notifications, ${unread} non consultees.` : "Ouvrir les notifications."}${important}${mail}`.trim());
    });
  }

  function apply() {
    if (!target || destroyed) return state;
    target.dataset.presenceEngine = isActive() ? "active" : "paused";
    target.dataset.presenceBrain = state.brain;
    target.dataset.presenceSync = state.sync;
    target.dataset.presenceMedia = state.media;
    target.dataset.presenceCalendar = state.calendar;
    target.dataset.presenceMail = state.mail;
    target.dataset.presenceNotifications = state.notifications ? "unread" : "read";
    target.dataset.presenceNotification = state.notificationsImportant ? "important" : state.notifications ? "normal" : "none";
    target.dataset.presenceRoute = state.route;
    renderNotificationBadges();
    return state;
  }

  function update(patch = {}) {
    if (destroyed) return state;
    const previous = state;
    state = mergeState(patch);
    const next = apply();
    if (next.brain !== previous.brain) signalIcon("brain");
    if (next.calendar === "approaching" && previous.calendar !== "approaching") signalIcon("calendar");
    if (next.notificationsImportant > previous.notificationsImportant) signalIcon("notifications");
    if (next.mail === "new" && previous.mail !== "new") signalIcon("mail");
    return next;
  }

  function setBrain(nextState, config = {}) {
    if (responseTimer) runtime.clearTimeout?.(responseTimer);
    responseTimer = 0;
    const next = update({ brain: nextState });
    if (next.brain === "responding") {
      const settleAfter = Math.min(3000, Math.max(600, Number(config.settleAfter) || 1400));
      responseTimer = runtime.setTimeout?.(() => {
        responseTimer = 0;
        update({ brain: "ready" });
      }, settleAfter) || 0;
    }
    return next;
  }

  function setMail(nextState = "new", config = {}) {
    if (mailTimer) runtime.clearTimeout?.(mailTimer);
    mailTimer = 0;
    const repeated = state.mail === "new" && nextState === "new";
    const next = update({ mail: nextState });
    if (repeated) signalIcon("mail");
    if (next.mail === "new") {
      const settleAfter = Math.min(5000, Math.max(1200, Number(config.settleAfter) || 2600));
      mailTimer = runtime.setTimeout?.(() => {
        mailTimer = 0;
        update({ mail: "idle" });
      }, settleAfter) || 0;
    }
    return next;
  }

  function handleMail(event) {
    const settleAfter = Number(event?.detail?.settleAfter) || 2600;
    setMail("new", { settleAfter });
  }

  function handleEnvironmentChange() {
    if (!isActive()) [...liveAnimations.keys()].forEach(cancelLiveAnimation);
    apply();
  }

  function start(initialState = null) {
    if (destroyed) return false;
    if (initialState) state = mergeState(initialState);
    if (!started) {
      started = true;
      documentRef?.addEventListener?.("visibilitychange", handleEnvironmentChange);
      documentRef?.addEventListener?.("ethone:mail-received", handleMail);
      reducedMotion?.addEventListener?.("change", handleEnvironmentChange);
    }
    apply();
    return true;
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    if (responseTimer) runtime.clearTimeout?.(responseTimer);
    responseTimer = 0;
    if (mailTimer) runtime.clearTimeout?.(mailTimer);
    mailTimer = 0;
    [...liveAnimations.keys()].forEach(cancelLiveAnimation);
    documentRef?.removeEventListener?.("visibilitychange", handleEnvironmentChange);
    documentRef?.removeEventListener?.("ethone:mail-received", handleMail);
    reducedMotion?.removeEventListener?.("change", handleEnvironmentChange);
    if (target?.dataset) {
      ["presenceEngine", "presenceBrain", "presenceSync", "presenceMedia", "presenceCalendar", "presenceMail", "presenceNotifications", "presenceNotification", "presenceRoute"]
        .forEach((key) => { delete target.dataset[key]; });
    }
    return true;
  }

  return Object.freeze({
    start,
    update,
    setBrain,
    setMail,
    revealWidgets,
    transitionSurface,
    transitionText,
    signalActivity,
    signalIcon,
    cancelTransition: cancelLiveAnimation,
    state: () => state,
    diagnostics: () => Object.freeze({
      ...state,
      active: isActive(),
      responseTimer: Boolean(responseTimer),
      mailTimer: Boolean(mailTimer),
      liveAnimations: liveAnimations.size,
      activityAnimations: [...liveAnimations.values()].filter((record) => record.marker === "activity").length,
      liveWidgets: documentRef?.querySelectorAll?.("[data-live-widget]")?.length || 0
    }),
    destroy
  });
}
