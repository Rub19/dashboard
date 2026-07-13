import { createStyleLoader } from "./core/style-loader.mjs";
import { createEntryCoordinator } from "./entry/entry-coordinator.mjs";
import { mountLogin } from "./entry/login.mjs";
import { mountProfileSelection } from "./entry/profile-selection.mjs";
import { mountApplication } from "./app/app-runtime.mjs";
import { createProfileRepository } from "./data/profile-repository.mjs";
import { createAuthAdapter } from "./services/auth-adapter.mjs";
import { PUBLIC_AUTH_CONFIG } from "./services/public-auth-config.mjs";
import { createNetworkClient } from "./services/network-client.mjs";
import { createServiceWorkerManager } from "./services/service-worker.mjs";
import { createExternalDiagnostics } from "./services/external-diagnostics.mjs";
import { createDocumentMetadataManager } from "./core/document-metadata.mjs";
import { element } from "./ui/dom.mjs";
import { createV8I18n } from "./i18n/runtime.mjs";
import { currentLocale, translateSource } from "./i18n/catalog.mjs";

const root = document.getElementById("ethone-v8-root");
const metadata = createDocumentMetadataManager(document);

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
  const title = element("h1", { text: translateSource("ETHONE n'a pas pu démarrer.", locale) });
  const message = element("p", { text: translateSource("L'interface principale est indisponible. Vos données n'ont pas été modifiées.", locale) });
  const link = element("a", { className: "v8-button v8-button--primary", text: translateSource("Recharger ETHONE", locale), attributes: { href: "./index.html" } });
  root.replaceChildren(element("main", { className: "v8-fatal-error" }, [title, message, link]));
  root.dataset.bootStatus = "failed";
  root.dataset.bootError = error?.name || "Error";
}

function mountBootSurface() {
  const surface = element("div", { className: "v8-boot", attributes: { role: "status", "aria-label": "Initialisation d'ETHONE" } }, [
    element("span", { className: "v8-boot__mark", text: "E", attributes: { "aria-hidden": "true" } }),
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
  const styles = createStyleLoader({ document, baseUrl: "./v8/styles" });
  let application = null;
  let coordinator = null;
  let destroyed = false;
  let pendingUpdate = null;
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
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    const script = document.getElementById("v8-supabase-client");
    if (!script) throw new Error("Le client Supabase n'est pas chargé.");
    await new Promise((resolve, reject) => {
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("Le client Supabase est indisponible.")), { once: true });
    });
    if (!globalThis.supabase?.createClient) throw new Error("Le client Supabase est indisponible.");
    return globalThis.supabase.createClient(PUBLIC_AUTH_CONFIG.supabaseUrl, PUBLIC_AUTH_CONFIG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  const auth = createAuthAdapter({
    clientFactory: createSupabaseClient,
    network,
    workerUrl: PUBLIC_AUTH_CONFIG.workerUrl,
    redirectUrl: new URL("./", globalThis.location.href).href,
    runtime: globalThis
  });
  const externalDiagnostics = createExternalDiagnostics({ network, auth, serviceWorker, config: PUBLIC_AUTH_CONFIG, runtime: globalThis });

  coordinator = createEntryCoordinator({
    auth,
    profiles: repository,
    prepareProfiles: (context) => {
      repository.setOwner(context.session?.user?.id || repository.owner());
      if (!repository.listProfiles().length) {
        const user = context.session?.user;
        repository.createProfile({ name: user?.name || user?.email?.split("@")[0] || "Mon environnement", type: "personal" });
      }
    },
    mountBoot: () => {
      styles.setEntryEnabled(true);
      styles.setApplicationEnabled(false);
      return mountBootSurface();
    },
    mountLogin: (context) => {
      repository.setOwner("");
      styles.setEntryEnabled(true);
      styles.setApplicationEnabled(false);
      metadata.setEntry("login");
      return mountLogin(root, {
        auth,
        authResult: context.authResult,
        onAuthenticated: (data) => {
          repository.setOwner(data?.user?.id || data?.session?.user?.id || "");
          return coordinator.showProfiles({ reason: "login-completed", session: data?.session });
        }
      });
    },
    mountProfiles: (context) => {
      styles.setEntryEnabled(true);
      styles.setApplicationEnabled(false);
      metadata.setEntry("profiles");
      return mountProfileSelection(root, {
        repository,
        profiles: context.profiles,
        onSignOut: () => coordinator.signOut(),
        onSelect: async (profile) => {
          const styleResult = await styles.loadApplication();
          if (!styleResult.ok) return styleResult;
          coordinator.enterHome({ reason: "profile-selected", profile });
          return Object.freeze({ ok: true, status: "completed", message: "Environnement ouvert.", data: profile });
        }
      });
    },
    mountHome: (context) => {
      styles.setEntryEnabled(false);
      styles.setApplicationEnabled(true);
      application = mountApplication(root, {
        repository,
        profile: context.profile || repository.activeProfile(),
        i18n,
        metadata,
        onSignOut: () => coordinator.signOut()
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
    i18n.destroy();
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
      network: network.diagnostics(),
      serviceWorker: serviceWorker.status(),
      metadata: metadata.current(),
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
