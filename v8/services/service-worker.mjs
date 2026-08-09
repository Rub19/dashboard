export function createServiceWorkerManager(options = {}) {
  const runtime = options.runtime || globalThis;
  let registration = null;
  let waiting = null;
  let destroyed = false;
  let refreshing = false;
  let updateHandler = null;
  let previousController = null;
  let activationRequested = false;
  const supported = () => Boolean(runtime.navigator?.serviceWorker && runtime.location?.protocol !== "file:" && !runtime.navigator?.webdriver);

  function announce(worker) {
    waiting = worker || registration?.waiting || null;
    if (!waiting) return;
    options.onUpdate?.({ activate: () => {
      activationRequested = true;
      waiting?.postMessage?.({ type: "ETHONE_SKIP_WAITING" });
    } });
  }

  function controllerChange() {
    if (refreshing || destroyed) return;
    const nextController = runtime.navigator?.serviceWorker?.controller || null;
    if (!previousController && nextController) {
      previousController = nextController;
      return;
    }
    if (previousController && nextController && previousController !== nextController) {
      refreshing = true;
      runtime.location.reload();
    }
  }

  async function start() {
    if (!supported() || destroyed) return Object.freeze({ ok: false, status: "unsupported" });
    try {
      previousController = runtime.navigator?.serviceWorker?.controller || null;
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
    activateUpdate: () => {
      activationRequested = true;
      return waiting?.postMessage?.({ type: "ETHONE_SKIP_WAITING" });
    },
    status: () => Object.freeze({ supported: supported(), registered: Boolean(registration), updateAvailable: Boolean(waiting) }),
    destroy
  });
}
