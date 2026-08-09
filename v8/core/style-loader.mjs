function result(ok, status, message, data = null) {
  return Object.freeze({ ok, status, message, data });
}

export const STYLE_RELEASE = "experience-v280";

export function createStyleLoader(options = {}) {
  const documentRef = options.document || globalThis.document;
  const baseUrl = String(options.baseUrl || "./v8/styles").replace(/\/$/, "");
  const release = encodeURIComponent(String(options.release || STYLE_RELEASE));
  const styleIds = Object.freeze(["shell", "workspaces", "activity"]);
  const pending = new Map();
  let applicationPromise = null;
  let applicationEnabled = false;

  function loadStyle(id) {
    const existing = documentRef?.querySelector?.(`[data-v8-style="${id}"]`);
    if (existing) return Promise.resolve(existing);
    if (pending.has(id)) return pending.get(id);

    const promise = new Promise((resolve, reject) => {
      const link = documentRef.createElement("link");
      link.rel = "stylesheet";
      link.href = `${baseUrl}/${id}.css?v=${release}`;
      link.dataset.v8Style = id;
      link.addEventListener("load", () => {
        link.disabled = !applicationEnabled;
        resolve(link);
      }, { once: true });
      link.addEventListener("error", () => reject(new Error(`Impossible de charger ${id}.css`)), { once: true });
      documentRef.head.append(link);
    }).finally(() => pending.delete(id));
    pending.set(id, promise);
    return promise;
  }

  function loadApplication() {
    if (applicationPromise) return applicationPromise;
    applicationPromise = Promise.all(styleIds.map(loadStyle))
      .then((links) => result(true, "completed", "Styles de l'application chargés.", { count: links.length }))
      .catch((error) => {
        applicationPromise = null;
        return result(false, "failed", "L'interface principale n'a pas pu être chargée.", error);
      });
    return applicationPromise;
  }

  function loaded() {
    return styleIds.every((id) => Boolean(documentRef?.querySelector?.(`[data-v8-style="${id}"]`)));
  }

  function setEntryEnabled(enabled) {
    const entryStyle = documentRef?.querySelector?.("[data-v8-entry-style]");
    if (!entryStyle) return false;
    entryStyle.disabled = !enabled;
    return true;
  }

  function setApplicationEnabled(enabled) {
    applicationEnabled = Boolean(enabled);
    let found = 0;
    styleIds.forEach((id) => {
      const link = documentRef?.querySelector?.(`[data-v8-style="${id}"]`);
      if (!link) return;
      link.disabled = !applicationEnabled;
      found += 1;
    });
    return found === styleIds.length;
  }

  return Object.freeze({ loadApplication, loaded, setApplicationEnabled, setEntryEnabled });
}
