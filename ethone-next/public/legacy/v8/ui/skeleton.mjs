import { element } from "./dom.mjs";

export function buildSkeletonList(count = 3) {
  const safeCount = Math.max(1, Math.min(12, Number(count) || 1));
  return element("div", {
    className: "v8-skeleton-list v8-scroll-contain",
    attributes: { role: "status", "aria-live": "polite", "aria-busy": "true", "aria-label": "Chargement du contenu" }
  }, Array.from({ length: safeCount }, (_, i) =>
    element("div", { className: "v8-skeleton-row" }, [
      element("span", { className: "v8-skeleton v8-skeleton--circle" }),
      element("div", { className: "v8-skeleton-row__lines" }, [
        element("span", { className: "v8-skeleton v8-skeleton-text" }),
        element("span", { className: "v8-skeleton v8-skeleton-text is-short" })
      ])
    ])
  ));
}
