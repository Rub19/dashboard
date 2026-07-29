import { createStyleLoader } from "./core/style-loader.mjs";
import { createEntryCoordinator } from "./entry/entry-coordinator.mjs";
import { mountLogin } from "./entry/login.mjs";
import { mountPasswordRecovery } from "./entry/password-recovery.mjs";
import { mountProfileSelection } from "./entry/profile-selection.mjs";
import { createProfileRepository } from "./data/profile-repository.mjs";
import { createAuthAdapter } from "./services/auth-adapter.mjs";
import { createAuthStorage } from "./services/auth-storage.mjs";
import { PUBLIC_AUTH_CONFIG } from "./services/public-auth-config.mjs";
import { createNetworkClient } from "./services/network-client.mjs";
import { createServiceWorkerManager } from "./services/service-worker.mjs";
import { createExternalDiagnostics } from "./services/external-diagnostics.mjs";
import { createExternalServicesClient } from "./services/external-services-client.mjs";
import { createSoundManager } from "./services/sound-manager.mjs";
import { createClockManager } from "./services/clock-manager.mjs";
import { createSupabaseStateSync } from "./services/supabase-state-sync.mjs";
import { createDocumentMetadataManager } from "./core/document-metadata.mjs";
import { createAmbientEngine, playSpotlight, readSpotlightPreference } from "./core/experience.mjs";
import { createPresenceEngine } from "./core/presence-engine.mjs";
import { element } from "./ui/dom.mjs";
import { BRAND_MARK_SVG } from "./ui/navigation.mjs";
import { statusState } from "./ui/empty-state.mjs";
import { createVisualHaptics } from "./ui/visual-haptics.mjs";
import { createNativeBehavior } from "./ui/native-behavior.mjs";
import { createTouchInteractionManager } from "./ui/touch-interactions.mjs";
import { createTooltipController } from "./ui/tooltip.mjs";
import { createV8I18n } from "./i18n/runtime.mjs";
import { currentLocale, translateSource } from "./i18n/catalog.mjs";

let appRuntimePromise = null;
let appRuntimeExports = null;
function loadAppRuntime() {
  if (!appRuntimePromise) {
    appRuntimePromise = import("./app/app-runtime.mjs").then((module) => {
      appRuntimeExports = module;
      return module;
    });
  }
  return appRuntimePromise;
}

const root = document.getElementById("ethone-v8-root");
const metadata = createDocumentMetadataManager(document);
document.documentElement.dataset.spotlight = readSpotlightPreference(globalThis.localStorage) ? "enabled" : "disabled";

function assertV8OnlyDocument() {
  const roots = document.querySelectorAll("#ethone-v8-root");
  if (roots.length !== 1) throw new Error("ETHONE requires exactly one application root.");
  const legacyPattern = /\/(?:actions|components|core|pages|services|state|ui|utils|widgets)\/|(?:dashboard-v4|dashboard-os2|dashboard-living|v7-os-shell|legacy-navigation)\.(?:js|css)$/i;
  const legacyAssets = [...document.querySelectorAll("script[src], link[href]")]
    .map((node) => node.src || node.href || "")
    .filter((url) => url && !url.includes("/v8/") && legacyPattern.test(new URL(url, location.href).pathname));
  if (legacyAssets.length) throw new Error("A retired ETHONE runtime asset is still referenced.");
  document.documentElement.dataset.ethoneRuntime = "v8-only";
}

function renderFatalError(error) {
  if (!root) return;
  metadata.setEntry("error");
  const locale = currentLocale();
  const link = element("a", { className: "v8-button v8-button--primary", text: translateSource("Recharger ETHONE", locale), attributes: { href: "./index.html" } });
  root.replaceChildren(statusState("error", {
    tagName: "main",
    headingTag: "h1",
    title: translateSource("ETHONE n'a pas pu démarrer.", locale),
    description: translateSource("L'interface principale est indisponible. Vos données n'ont pas été modifiées.", locale),
    actions: [link],
    className: "v8-fatal-error"
  }));
  root.dataset.bootStatus = "failed";
  root.dataset.bootError = error?.name || "Error";
}

function mountBootSurface() {
  const mark = element("span", { className: "v8-boot__mark", attributes: { "aria-hidden": "true" } });
  mark.innerHTML = BRAND_MARK_SVG;
  const surface = element("div", { className: "v8-boot", attributes: { role: "status", "aria-label": "Initialisation d'ETHONE" } }, [
    mark,
    element("span", { className: "v8-boot__label", text: "ETHONE" })
  ]);
  root.replaceChildren(surface);
  metadata.setEntry("boot");
  return () => surface.remove();
}

async function boot() {
  assertV8OnlyDocument();
  if (!root) throw new Error("ETHONE root is missing");
  if (globalThis.__ETHONE_V8_BOOTED__) return;
  globalThis.__ETHONE_V8_BOOTED__ = true;
  const startedAt = performance.now();
  const repository = createProfileRepository({ requireOwner: true });
  const network = createNetworkClient({ runtime: globalThis });
  const authStorage = createAuthStorage(globalThis);
  const sounds = createSoundManager({ runtime: globalThis, document, storage: globalThis.localStorage });
  const haptics = createVisualHaptics({ document, runtime: globalThis });
  const nativeBehavior = createNativeBehavior({ document, runtime: globalThis });
  const touchInteractions = createTouchInteractionManager({ document, runtime: globalThis });
  const tooltips = createTooltipController({ document, runtime: globalThis });
  haptics.start();
  nativeBehavior.start();
  touchInteractions.start();
  tooltips.start();
  const styles = createStyleLoader({ document, baseUrl: "./v8/styles" });
  let application = null;
  let coordinator = null;
  let destroyed = false;
  let pendingUpdate = null;
  let spotlightTransition = null;
  const ambient = createAmbientEngine({
    target: document.documentElement,
    document,
    runtime: globalThis,
    soundManager: sounds,
    getState: () => application?.getState?.() || repository.activeProfile?.() || {}
  });
  ambient.start();
  const presence = createPresenceEngine({ target: document.documentElement, document, runtime: globalThis });
  presence.start({ route: "boot", brain: "ready", sync: "idle", notifications: 0 });
  const serviceWorker = createServiceWorkerManager({
    runtime: globalThis,
    onUpdate: (update) => {
      pendingUpdate = update;
      application?.notify?.({
        id: "ethone-update-available",
        title: "Mise à jour disponible",
        message: "Une nouvelle version d'ETHONE est prête. Rechargez pour l'appliquer.",
        type: "info",
        duration: 0,
        action: { label: "Mettre à jour", run: () => update.activate() }
      });
    }
  });
  const i18n = createV8I18n(root, {
    storage: globalThis.localStorage,
    onChange: (locale) => {
      metadata.setLocale(locale);
      if (application?.refresh) {
        application.refresh();
        return;
      }
      metadata.refresh();
    }
  });
  metadata.setLocale(i18n.locale());
  const clock = createClockManager({ runtime: globalThis, document, locale: () => i18n.locale() });
  clock.start();

  function markBootReady() {
    root.dataset.bootStatus = "ready";
    if (!root.dataset.bootMs) {
      root.dataset.bootMs = String(Math.round(performance.now() - startedAt));
    }
    return Number(root.dataset.bootMs);
  }

  async function createSupabaseClient() {
    if (globalThis.supabase?.createClient) {
      return globalThis.supabase.createClient(PUBLIC_AUTH_CONFIG.supabaseUrl, PUBLIC_AUTH_CONFIG.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce", storage: authStorage }
      });
    }
    const script = document.getElementById("v8-supabase-client");
    if (!script) throw new Error("Le client Supabase n'est pas chargé.");
    await new Promise((resolve, reject) => {
      let settled = false;
      let timeout = 0;
      const finish = (error = null) => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeout);
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
        if (error) reject(error);
        else resolve();
      };
      const handleLoad = () => finish();
      const handleError = () => finish(new Error("Le client Supabase est indisponible."));
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      timeout = globalThis.setTimeout(() => {
        finish(globalThis.supabase?.createClient ? null : new Error("Le chargement du client Supabase a expiré."));
      }, 8000);
      // The deferred CDN script can finish between the first guard and listener setup.
      if (globalThis.supabase?.createClient) finish();
    });
    if (!globalThis.supabase?.createClient) throw new Error("Le client Supabase est indisponible.");
    return globalThis.supabase.createClient(PUBLIC_AUTH_CONFIG.supabaseUrl, PUBLIC_AUTH_CONFIG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce", storage: authStorage }
    });
  }

  const auth = createAuthAdapter({
    clientFactory: createSupabaseClient,
    redirectUrl: new URL("./", globalThis.location.href).href,
    runtime: globalThis
  });
  const externalServices = createExternalServicesClient({ network, auth, runtime: globalThis });
  const cloudSync = createSupabaseStateSync({ runtime: globalThis, storage: globalThis.localStorage });
  const externalDiagnostics = createExternalDiagnostics({ network, auth, serviceWorker, externalServices, config: PUBLIC_AUTH_CONFIG, runtime: globalThis });

  coordinator = createEntryCoordinator({
    auth,
    profiles: repository,
    prepareProfiles: async (context) => {
      const owner = context.session?.user?.id || repository.owner();
      repository.setOwner(owner);
      sounds.setOwner(owner);
      const client = await auth.getClient();
      const syncResult = await cloudSync.start({ client, ownerId: owner, repository });
      const cloudPreferences = cloudSync.preferences();
      if (cloudPreferences.locale) i18n.setLocale(cloudPreferences.locale, { announce: false });
      if (cloudPreferences.sound) sounds.setPreferences(cloudPreferences.sound);
      if (!repository.listProfiles().length) {
        const user = context.session?.user;
        repository.createProfile({ name: user?.name || user?.email?.split("@")[0] || "Mon environnement", type: "personal" });
      }
      if (syncResult.ok && cloudSync.status().revision === 0 && repository.listProfiles().length) {
        cloudSync.queue("cloud-bootstrap");
        await cloudSync.flush();
      }
      return syncResult;
    },
    mountBoot: () => {
      presence.update({ route: "boot", notifications: 0 });
      styles.setEntryEnabled(true);
      styles.setApplicationEnabled(false);
      return mountBootSurface();
    },
    mountLogin: (context) => {
      presence.update({ route: "login", notifications: 0, sync: "idle" });
      cloudSync.stop();
      repository.setOwner("");
      sounds.setOwner("");
      styles.setEntryEnabled(true);
      styles.setApplicationEnabled(false);
      metadata.setEntry("login");
      ambient.refresh();
      return mountLogin(root, {
        auth,
        clockManager: clock,
        authResult: context.authResult,
        onAuthenticated: (data) => {
          const owner = data?.user?.id || data?.session?.user?.id || "";
          repository.setOwner(owner);
          sounds.setOwner(owner);
          sounds.play("auth.login");
          return coordinator.showProfiles({ reason: "login-completed", session: data?.session });
        }
      });
    },
    mountRecovery: (context) => {
      presence.update({ route: "recovery", notifications: 0, sync: "idle" });
      cloudSync.stop();
      repository.setOwner("");
      sounds.setOwner("");
      styles.setEntryEnabled(true);
      styles.setApplicationEnabled(false);
      metadata.setEntry("login");
      return mountPasswordRecovery(root, {
        auth,
        onCompleted: () => {
          const owner = context.session?.user?.id || "";
          repository.setOwner(owner);
          sounds.setOwner(owner);
          coordinator.showProfiles({ reason: "password-recovery-completed", session: context.session });
        },
        onSignOut: () => {
          sounds.play("auth.logout");
          return coordinator.signOut();
        }
      });
    },
    mountProfiles: (context) => {
      presence.update({ route: "profiles", notifications: 0, sync: "idle" });
      sounds.setOwner(context.session?.user?.id || repository.owner());
      ambient.refresh(repository.activeProfile?.() || context.profiles?.[0] || {});
      styles.setEntryEnabled(true);
      styles.setApplicationEnabled(false);
      metadata.setEntry("profiles");
      loadAppRuntime();

      async function selectProfile(profile) {
        const [styleResult] = await Promise.all([styles.loadApplication(), loadAppRuntime()]);
        if (!styleResult.ok) return styleResult;
        coordinator.enterHome({ reason: "profile-selected", profile });
        sounds.play("profile.enter");
        return Object.freeze({ ok: true, status: "completed", message: "Environnement ouvert.", data: profile });
      }

      const onlyProfile = context.profiles?.length === 1 && !context.profiles[0].locked ? context.profiles[0] : null;
      if (onlyProfile) {
        selectProfile(onlyProfile);
        return mountBootSurface();
      }

      return mountProfileSelection(root, {
        repository,
        profiles: context.profiles,
        clockManager: clock,
        cloudSync,
        presenceEngine: presence,
        onSignOut: () => {
          sounds.play("auth.logout");
          return coordinator.signOut();
        },
        onSelect: selectProfile
      });
    },
    mountHome: (context) => {
      styles.setEntryEnabled(false);
      styles.setApplicationEnabled(true);
      application = appRuntimeExports.mountApplication(root, {
        repository,
        profile: context.profile || repository.activeProfile(),
        i18n,
        metadata,
        soundManager: sounds,
        ambientEngine: ambient,
        presenceEngine: presence,
        cloudSync,
        clockManager: clock,
        externalServices,
        clientProvider: () => auth.getClient(),
        ownerId: repository.owner(),
        onSignOut: () => coordinator.signOut()
      });
      spotlightTransition?.destroy?.();
      spotlightTransition = playSpotlight(root, {
        enabled: application.getState().spotlightEnabled,
        runtime: globalThis
      });
      markBootReady();
      if (pendingUpdate) {
        application.notify?.({
          id: "ethone-update-available",
          title: "Mise à jour disponible",
          message: "Une nouvelle version d'ETHONE est prête. Rechargez pour l'appliquer.",
          type: "info",
          duration: 0,
          action: { label: "Mettre à jour", run: () => pendingUpdate.activate() }
        });
      }
      return () => {
        spotlightTransition?.destroy?.();
        spotlightTransition = null;
        application?.destroy();
        application = null;
      };
    }
  });

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    globalThis.removeEventListener("pagehide", handlePageHide);
    coordinator.destroy();
    serviceWorker.destroy();
    externalServices.destroy();
    auth.destroy();
    cloudSync.destroy();
    clock.destroy();
    i18n.destroy();
    ambient.destroy();
    presence.destroy();
    haptics.destroy();
    nativeBehavior.destroy();
    touchInteractions.destroy();
    tooltips.destroy();
    sounds.destroy();
    delete globalThis.__ETHONE_V8__;
    globalThis.__ETHONE_V8_BOOTED__ = false;
    return true;
  }

  function handlePageHide(event) {
    if (!event.persisted) destroy();
  }

  globalThis.__ETHONE_V8__ = Object.freeze({
    getState: () => application?.getState?.() || Object.freeze({ entry: coordinator.state() }),
    dispatch: (actionId, context) => application?.dispatch?.(actionId, context) || Object.freeze({ ok: false, status: "unavailable", message: "Le système principal n'est pas ouvert.", data: null }),
    navigate: (route) => application?.navigate?.(route) || null,
    setLocale: (locale) => i18n.setLocale(locale),
    runExternalDiagnostics: () => externalDiagnostics.run(),
    diagnostics: () => Object.freeze({
      entryState: coordinator.state(),
      selectedProfile: repository.activeProfile()?.id || null,
      applicationStylesLoaded: styles.loaded(),
      locale: i18n.locale(),
      i18n: i18n.audit(),
      auth: auth.status(),
      cloudSync: cloudSync.diagnostics(),
      clock: clock.diagnostics(),
      network: network.diagnostics(),
      externalServices: externalServices.diagnostics(),
      serviceWorker: serviceWorker.status(),
      metadata: metadata.current(),
      sounds: sounds.diagnostics(),
      haptics: haptics.diagnostics(),
      nativeBehavior: nativeBehavior.diagnostics(),
      touchInteractions: touchInteractions.diagnostics(),
      tooltips: tooltips.diagnostics(),
      presence: presence.diagnostics(),
      bootMs: Number(root.dataset.bootMs || Math.round(performance.now() - startedAt)),
      ...(application?.diagnostics?.() || {})
    }),
    destroy
  });

  globalThis.addEventListener("pagehide", handlePageHide);
  await coordinator.start();
  serviceWorker.start();
  markBootReady();
}

boot().catch((error) => {
  globalThis.__ETHONE_V8_BOOTED__ = false;
  renderFatalError(error);
});
