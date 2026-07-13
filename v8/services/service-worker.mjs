export function createServiceWorkerManager(options = {}) {
  const runtime = options.runtime || globalThis;
  let registration = null;
  let waiting = null;
  let destroyed = false;
  let refreshing = false;
  let updateHandler = null;
  const supported = () => Boolean(runtime.navigator?.serviceWorker && runtime.location?.protocol !== "file:" && !runtime.navigator?.webdriver);

  function announce(worker) {
    waiting = worker || registration?.waiting || null;
    if (!waiting) return;
    options.onUpdate?.({ activate: () => waiting?.postMessage?.({ type: "ETHONE_SKIP_WAITING" }) });
  }

  function controllerChange() {
    if (refreshing || destroyed) return;
    refreshing = true;
    runtime.location.reload();
  }

  async function start() {
    if (!supported() || destroyed) return Object.freeze({ ok: false, status: "unsupported" });
    try {
      registration = await runtime.navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      updateHandler = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && runtime.navigator.serviceWorker.controller) announce(worker);
        });
      };
      registration.addEventListener("updatefound", updateHandler);
      runtime.navigator.serviceWorker.addEventListener("controllerchange", controllerChange);
      if (registration.waiting) announce(registration.waiting);
      registration.update().catch(() => {});
      return Object.freeze({ ok: true, status: registration.waiting ? "update-available" : "ready" });
    } catch (error) {
      return Object.freeze({ ok: false, status: "failed", message: String(error?.message || "Service Worker unavailable").slice(0, 240) });
    }
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    registration?.removeEventListener?.("updatefound", updateHandler);
    runtime.navigator?.serviceWorker?.removeEventListener?.("controllerchange", controllerChange);
    waiting = null;
    registration = null;
    return true;
  }

  return Object.freeze({
    start,
    activateUpdate: () => waiting?.postMessage?.({ type: "ETHONE_SKIP_WAITING" }),
    status: () => Object.freeze({ supported: supported(), registered: Boolean(registration), updateAvailable: Boolean(waiting) }),
    destroy
  });
}
