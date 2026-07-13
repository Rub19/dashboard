import { STYLE_RELEASE } from "../core/style-loader.mjs";

let pending = null;

export function prepareActivityUI() {
  const existing = document.querySelector('[data-v8-style="activity"]');
  if (existing?.dataset.loaded === "true") return Promise.resolve(existing);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const link = existing || document.createElement("link");
    if (!existing) {
      link.rel = "stylesheet";
      link.href = `./v8/styles/activity.css?v=${encodeURIComponent(STYLE_RELEASE)}`;
      link.dataset.v8Style = "activity";
    }
    link.addEventListener("load", () => {
      link.dataset.loaded = "true";
      resolve(link);
    }, { once: true });
    link.addEventListener("error", () => {
      link.remove();
      reject(new Error("Activity UI styles unavailable"));
    }, { once: true });
    if (!existing) document.head.append(link);
    else if (link.sheet) {
      link.dataset.loaded = "true";
      resolve(link);
    }
  }).finally(() => { pending = null; });
  return pending;
}
