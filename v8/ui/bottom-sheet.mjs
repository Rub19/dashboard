import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";

const DEFAULT_DURATION = 220;

export function showBottomSheet({ title, children = [], host, onClose, className = "" } = {}) {
  const root = host || (typeof document !== "undefined" ? document.body : null);
  if (!root) return { close: () => {}, element: null };

  let isClosing = false;
  let touchStartY = 0;
  let swipeDelta = 0;

  const closeButton = element("button", {
    className: "v8-icon-button v8-bottom-sheet__close",
    attributes: { type: "button", "aria-label": "Fermer" },
    events: { click: () => close() }
  }, [icon("x")]);

  const titleEl = element("h2", { id: "v8-bottom-sheet-title", className: "v8-bottom-sheet__title", text: title || "" });
  const handle = element("div", { className: "v8-bottom-sheet__handle", attributes: { "aria-hidden": "true" } }, [
    element("span", { className: "v8-bottom-sheet__handle-bar" })
  ]);
  const content = element("div", { className: "v8-bottom-sheet__content" }, children);

  const panel = element("div", {
    className: `v8-bottom-sheet${className ? ` ${className}` : ""}`,
    attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-bottom-sheet-title" }
  }, [
    handle,
    element("header", { className: "v8-bottom-sheet__header" }, [titleEl, closeButton]),
    content
  ]);

  const layer = element("div", { className: "v8-bottom-sheet-layer" }, [panel]);

  function onLayerClick(event) {
    if (event.target === layer) close();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  function onTouchStart(event) {
    if (event.changedTouches.length !== 1) return;
    touchStartY = event.changedTouches[0].clientY;
    swipeDelta = 0;
  }

  function onTouchMove(event) {
    if (!touchStartY) return;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (deltaY > 0) {
      swipeDelta = deltaY;
      panel.style.transform = `translateY(${Math.min(deltaY, 120)}px)`;
    }
  }

  function onTouchEnd() {
    if (swipeDelta > 80) {
      close();
    } else {
      panel.style.transform = "";
    }
    touchStartY = 0;
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeydown);
    layer.removeEventListener("click", onLayerClick);
    handle.removeEventListener("touchstart", onTouchStart);
    handle.removeEventListener("touchmove", onTouchMove);
    handle.removeEventListener("touchend", onTouchEnd);
  }

  function close() {
    if (isClosing) return;
    isClosing = true;
    panel.style.transform = "translateY(100%)";
    layer.classList.remove("is-open");
    setTimeout(() => {
      layer.remove();
      cleanup();
      if (typeof onClose === "function") onClose();
    }, DEFAULT_DURATION);
  }

  document.addEventListener("keydown", onKeydown);
  layer.addEventListener("click", onLayerClick);
  handle.addEventListener("touchstart", onTouchStart, { passive: true });
  handle.addEventListener("touchmove", onTouchMove, { passive: true });
  handle.addEventListener("touchend", onTouchEnd);

  root.append(layer);
  layer.getBoundingClientRect();
  requestAnimationFrame(() => layer.classList.add("is-open"));
  refreshIcons();

  return { close, element: layer };
}
