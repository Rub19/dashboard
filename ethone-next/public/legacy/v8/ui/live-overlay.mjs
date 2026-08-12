import { element, icon } from "./dom.mjs";

let activeOverlay = null;

export function openLiveOverlay(bodyContent, options = {}) {
  const title = options.title || "";
  const onClose = options.onClose;
  const documentRef = options.document || globalThis.document;
  if (activeOverlay) {
    activeOverlay.remove();
    activeOverlay = null;
  }

  const closeButton = element("button", {
    className: "v8-icon-button v8-live-overlay__close",
    attributes: { type: "button", "aria-label": "Fermer" },
    events: { click: close }
  }, [icon("x")]);

  const header = element("header", { className: "v8-live-overlay__header" }, [
    title ? element("strong", { text: title }) : null,
    closeButton
  ].filter(Boolean));

  const panel = element("div", {
    className: "v8-live-overlay__panel",
    attributes: { role: "dialog", "aria-modal": "true" }
  }, [header, element("div", { className: "v8-live-overlay__body" }, [bodyContent])]);

  const backdrop = element("div", {
    className: "v8-live-overlay",
    attributes: { "aria-hidden": "false" }
  }, [panel]);

  function close() {
    if (!activeOverlay) return;
    backdrop.remove();
    activeOverlay = null;
    try { onClose?.(); } catch {}
  }

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });

  documentRef.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeOverlay === backdrop) close();
  }, { once: true });

  documentRef.body.append(backdrop);
  activeOverlay = backdrop;
  closeButton.focus();
  return close;
}
