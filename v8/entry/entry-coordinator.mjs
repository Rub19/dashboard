import { createLifecycle } from "../core/lifecycle.mjs";

function cleanupFor(mounted) {
  if (typeof mounted === "function") return mounted;
  if (mounted && typeof mounted.destroy === "function") return () => mounted.destroy();
  return null;
}

export function createEntryCoordinator(options = {}) {
  const auth = options.auth;
  const profiles = options.profiles;
  if (!auth || !profiles) throw new TypeError("Entry coordinator requires auth and profile adapters");

  const mounts = Object.freeze({
    booting: options.mountBoot,
    login: options.mountLogin,
    recovery: options.mountRecovery,
    profiles: options.mountProfiles,
    home: options.mountHome
  });
  const lifecycle = createLifecycle();
  let currentState = "idle";
  let generation = 0;
  let started = false;
  let startPromise = null;
  let releaseAuth = null;
  let destroyed = false;
  let profileRequest = 0;

  function transition(nextState, context = {}) {
    if (destroyed) return generation;
    if (currentState === nextState && context.force !== true) return generation;
    const mount = mounts[nextState];
    if (typeof mount !== "function") throw new TypeError(`Missing entry mount for ${nextState}`);
    generation += 1;
    currentState = nextState;
    lifecycle.mount(`entry:${nextState}`, () => cleanupFor(mount(Object.freeze({ ...context, state: nextState }))));
    return generation;
  }

  function showLogin(context = {}) {
    profileRequest += 1;
    transition("login", context);
    return currentState;
  }

  async function showProfiles(context = {}) {
    const request = ++profileRequest;
    let prepareResult = null;
    try { prepareResult = await options.prepareProfiles?.(context); } catch (error) { prepareResult = { ok: false, status: "failed", message: error?.message || "Préparation impossible." }; }
    if (destroyed || request !== profileRequest) return currentState;
    const availableProfiles = profiles.listProfiles();
    transition("profiles", { ...context, profiles: availableProfiles, prepareResult });
    return currentState;
  }

  function enterHome(context = {}) {
    profileRequest += 1;
    transition("home", context);
    return currentState;
  }

  function handleAuthEvent(event) {
    if (destroyed || !event) return;
    if (event.type === "SIGNED_OUT") {
      options.onSignOut?.();
      showLogin({ reason: "auth-signed-out" });
      return;
    }
    if (event.type === "PASSWORD_RECOVERY" && event.session?.user) {
      profileRequest += 1;
      transition("recovery", { reason: "password-recovery", session: event.session });
      return;
    }
    if (event.type === "SIGNED_IN" && event.session?.user && currentState !== "home" && currentState !== "recovery") {
      void showProfiles({ reason: "auth-signed-in", session: event.session });
    }
  }

  function start() {
    if (destroyed) return Promise.resolve("destroyed");
    if (startPromise) return startPromise;
    if (started) return Promise.resolve(currentState);
    started = true;
    releaseAuth = auth.subscribe(handleAuthEvent);
    const token = transition("booting", { reason: "startup" });

    startPromise = (async () => {
      const initialized = await auth.initialize();
      if (destroyed || token !== generation) return currentState;
      if (!initialized.ok) {
        showLogin({ reason: "auth-unavailable", authResult: initialized });
        return currentState;
      }

      const sessionResult = await auth.getSession();
      if (destroyed || token !== generation) return currentState;
      if (!sessionResult.ok) {
        showLogin({ reason: "session-error", authResult: sessionResult });
        return currentState;
      }
      if (sessionResult.data?.session?.user) {
        await showProfiles({ reason: "session-restored", session: sessionResult.data.session });
      } else {
        showLogin({ reason: "session-missing" });
      }
      return currentState;
    })();

    return startPromise;
  }

  async function signOut() {
    if (destroyed) return Object.freeze({ ok: false, status: "unavailable", message: "ETHONE est arrêté.", data: null });
    options.onSignOut?.();
    const response = await auth.signOut();
    if (response.ok) showLogin({ reason: "signed-out" });
    return response;
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    generation += 1;
    profileRequest += 1;
    lifecycle.unmount();
    releaseAuth?.();
    releaseAuth = null;
    auth.destroy();
    currentState = "destroyed";
    return true;
  }

  return Object.freeze({
    start,
    showLogin,
    showProfiles,
    enterHome,
    signOut,
    state: () => currentState,
    stats: () => Object.freeze({ state: currentState, generation, mounted: lifecycle.stats().mounted }),
    destroy
  });
}
