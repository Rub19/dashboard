import { connectionMethod, connectionMethods, integrationById } from "../data/intégrations.mjs";

const OPPORTUNITY_RULES = Object.freeze([
  Object.freeze({ sourceId: "discord", targetId: "spotify", methodId: "discord-lanyard", title: "Spotify detecte via Discord", description: "Utilisez la presence Discord publique pour afficher le morceau en cours, sans contrôle de lecture." }),
  Object.freeze({ sourceId: "lastfm", targetId: "spotify", methodId: "lastfm-history", title: "Historique Spotify via Last.fm", description: "Reutilisez vos scrobbles pour alimenter les statistiques musicales d'ETHONE." }),
  Object.freeze({ sourceId: "github", targetId: "vscode", methodId: "local-bridge", title: "Contexte de code disponible", description: "Associez le bridge local VS Code a votre activité GitHub existante." }),
  Object.freeze({ sourceId: "google-calendar", targetId: "google-drive", methodId: "oauth-secure", title: "Ecosysteme Google detecte", description: "Preparez Drive dans le même projet Cloud, avec un consentement et des scopes distincts." })
]);

const WORKER_SERVICES = Object.freeze({
  steam: "steam",
  "tracker-gg": "tracker",
  riot: "tracker",
  twitch: "twitch",
  lastfm: "lastfm",
  weather: "weather",
  minecraft: "minecraft",
  github: "github",
  "google-calendar": "google-calendar",
  notion: "notion",
  todoist: "todoist"
});

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function connectionsById(connections = []) {
  return new Map((Array.isArray(connections) ? connections : []).map((connection) => [String(connection?.id || ""), connection]));
}

export function connectionState(integration, connection) {
  const selected = connectionMethod(integration, connection?.methodId);
  if (connection?.status === "connected") return "connected";
  if (["error", "permission-denied", "token-expired"].includes(connection?.status)) return "attention";
  if (connection?.status === "syncing") return "syncing";
  if (selected?.disabled) return "limited";
  if (connection?.setupComplete) return "prepared";
  return "available";
}

export function filterConnectionCatalog(integrations, options = {}) {
  const category = String(options.category || "all");
  const status = String(options.status || "all");
  const query = normalized(options.query);
  const map = connectionsById(options.connections);
  return Object.freeze((Array.isArray(integrations) ? integrations : []).filter((integration) => {
    if (category !== "all" && integration.category !== category) return false;
    const connection = map.get(integration.id);
    if (status !== "all" && connectionState(integration, connection) !== status) return false;
    if (!query) return true;
    const methods = connectionMethods(integration);
    const haystack = normalized([
      integration.name,
      integration.description,
      integration.category,
      integration.liveSignal,
      ...methods.flatMap((method) => [method.label, method.summary, ...method.badges, ...method.capabilities])
    ].join(" "));
    return haystack.includes(query);
  }));
}

export function sortConnectionCatalog(integrations = [], order = "recommended", connections = []) {
  const map = connectionsById(connections);
  const stateRank = Object.freeze({ connected: 0, syncing: 1, attention: 2, prepared: 3, available: 4, limited: 5 });
  return Object.freeze((Array.isArray(integrations) ? integrations : []).slice().sort((left, right) => {
    if (order === "name") return String(left.name || "").localeCompare(String(right.name || ""), "fr", { sensitivity: "base" });
    if (order === "category") return String(left.category || "").localeCompare(String(right.category || "")) || String(left.name || "").localeCompare(String(right.name || ""));
    const leftState = connectionState(left, map.get(left.id));
    const rightState = connectionState(right, map.get(right.id));
    return (stateRank[leftState] ?? 9) - (stateRank[rightState] ?? 9) || String(left.name || "").localeCompare(String(right.name || ""));
  }));
}

export function connectionMetrics(integrations, connections = []) {
  const map = connectionsById(connections);
  const states = (Array.isArray(integrations) ? integrations : []).map((integration) => connectionState(integration, map.get(integration.id)));
  return Object.freeze({
    total: states.length,
    connected: states.filter((state) => state === "connected").length,
    prepared: states.filter((state) => state === "prepared").length,
    attention: states.filter((state) => state === "attention").length,
    available: states.filter((state) => state === "available").length
  });
}

export function formatConnectionTime(value, now = Date.now()) {
  if (!value) return "Jamais";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Inconnue";
  const elapsed = Math.max(0, Number(now) - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export function connectionSummary(integration, connection, now = Date.now()) {
  const selected = connectionMethod(integration, connection?.methodId);
  const state = connectionState(integration, connection);
  return Object.freeze({
    state,
    method: selected,
    quality: state === "connected" ? "Operationnelle" : state === "prepared" ? "Préparée" : selected?.quality || "Indisponible",
    permissions: selected?.permissions || Object.freeze([]),
    lastSync: formatConnectionTime(connection?.lastSyncAt, now),
    response: Number.isFinite(Number(connection?.responseMs)) ? `${Math.max(0, Math.round(Number(connection.responseMs)))} ms` : "Non mesuré",
    apiVersion: connection?.apiVersion && connection.apiVersion !== "Non connectée" ? connection.apiVersion : selected?.apiVersion || "Non disponible"
  });
}

export function methodAvailability(method, connections = []) {
  if (!method) return Object.freeze({ usable: false, label: "Indisponible", reason: "Méthode inconnue" });
  if (method.disabled) return Object.freeze({ usable: false, label: "Accès limite", reason: "Le fournisseur ne propose pas encore un accès adapte." });
  if (method.dependency) {
    const dependency = connectionsById(connections).get(method.dependency);
    if (dependency?.status !== "connected") {
      const source = integrationById(method.dependency);
      return Object.freeze({ usable: false, label: "Prerequis", reason: `Connectez d'abord ${source?.name || method.dependency}.` });
    }
  }
  if ((method.availability === "backend" || method.availability === "public" || method.availability === "bridge") && !method.live) {
    return Object.freeze({ usable: false, label: "Bientot disponible", reason: "Le backend ETHONE ne prend pas encore en charge cette méthode. Rien a configurer pour l'instant." });
  }
  const labels = { backend: "Backend requis", local: "Local", public: "Disponible", bridge: "Via connexion", restricted: "Accès limite", limited: "Indisponible" };
  return Object.freeze({ usable: true, label: labels[method.availability] || "Disponible", reason: "" });
}

export function detectConnectionOpportunities(connections = []) {
  const map = connectionsById(connections);
  return Object.freeze(OPPORTUNITY_RULES.filter((rule) => {
    const source = map.get(rule.sourceId);
    const target = map.get(rule.targetId);
    return source?.status === "connected" && target?.status !== "connected" && target?.methodId !== rule.methodId;
  }).map((rule) => Object.freeze({
    ...rule,
    source: integrationById(rule.sourceId),
    target: integrationById(rule.targetId)
  })));
}

export function runConnectionDiagnostics(integration, connection, method, options = {}) {
  const selected = method || connectionMethod(integration, connection?.methodId);
  const online = options.online !== false;
  const now = Number(options.now) || Date.now();
  const syncTime = connection?.lastSyncAt ? new Date(connection.lastSyncAt).getTime() : NaN;
  const stale = Number.isFinite(syncTime) && now - syncTime > 15 * 60 * 1000;
  const checks = [
    Object.freeze({ id: "network", label: "Navigateur", status: online ? "pass" : "fail", detail: online ? "Connexion réseau disponible." : "Le navigateur est hors ligne." }),
    Object.freeze({ id: "method", label: "Méthode", status: selected?.disabled ? "fail" : "pass", detail: selected?.disabled ? "Accès fournisseur insuffisant pour activer ce connecteur." : `${selected?.label || "Méthode"} selectionnee.` }),
    Object.freeze({ id: "setup", label: "Préparation locale", status: connection?.setupComplete ? "pass" : "warn", detail: connection?.setupComplete ? "Metadonnees validees, sans donnée sensible." : "Le guide n'est pas encore terminé." }),
    Object.freeze({ id: "session", label: "Session distante", status: connection?.status === "connected" ? "pass" : "idle", detail: connection?.status === "connected" ? "Connexion declaree active par le runtime." : selected?.availability === "backend" ? "Non testee : aucun backend OAuth n'est branche." : "Aucune session distante active." }),
    Object.freeze({ id: "freshness", label: "Fraîcheur", status: !Number.isFinite(syncTime) ? "idle" : stale ? "warn" : "pass", detail: !Number.isFinite(syncTime) ? "Aucune synchronisation mesurée." : stale ? "La dernière synchronisation est ancienne." : "Synchronisation récente." }),
    Object.freeze({ id: "storage", label: "Stockage frontend", status: "pass", detail: "ETHONE conserve uniquement les metadonnees de configuration." })
  ];
  const failed = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  return Object.freeze({
    status: failed ? "critical" : warnings ? "warning" : connection?.status === "connected" ? "healthy" : "ready",
    checks: Object.freeze(checks),
    failed,
    warnings,
    ranAt: new Date(now).toISOString()
  });
}

export function workerServiceForConnection(integrationId, methodId = "") {
  const id = String(integrationId || "");
  const method = String(methodId || "");
  if (id === "discord" && method === "lanyard-presence") return "lanyard";
  if (id === "spotify" && method === "discord-lanyard") return "lanyard";
  if (id === "spotify" && method === "lastfm-history") return "lastfm";
  if (id === "spotify" && method === "oauth-pkce") return "spotify";
  return WORKER_SERVICES[id] || "";
}

export function mergeWorkerDiagnostic(localReport, options = {}) {
  const report = localReport && typeof localReport === "object"
    ? localReport
    : Object.freeze({ status: "ready", checks: Object.freeze([]), failed: 0, warnings: 0, ranAt: new Date().toISOString() });
  const service = String(options.service || "");
  const response = options.response;
  const failure = options.error;
  let workerCheck;
  let workerVerified = false;
  let workerAvailable = false;

  if (!service) {
    workerCheck = Object.freeze({
      id: "worker",
      label: "ETHONE Worker",
      status: "idle",
      detail: "Cette méthode n'utilisé pas encore une route Worker migree."
    });
  } else if (failure) {
    const message = String(failure?.message || "Le Worker sécurisé est indisponible.").replace(/\s+/g, " ").slice(0, 180);
    workerCheck = Object.freeze({
      id: "worker",
      label: "ETHONE Worker",
      status: "fail",
      detail: message
    });
  } else {
    const serviceState = Array.isArray(response?.data?.services)
      ? response.data.services.find((entry) => entry?.id === service)
      : null;
    workerVerified = response?.ok === true && Boolean(response?.meta?.requestId) && Boolean(serviceState);
    workerAvailable = workerVerified && serviceState.routeEnabled === true && serviceState.available === true;
    workerCheck = Object.freeze({
      id: "worker",
      label: "ETHONE Worker",
      status: !workerVerified || serviceState?.routeEnabled !== true ? "fail" : workerAvailable ? "pass" : "warn",
      detail: !workerVerified
        ? "La réponse du Worker n'a pas pu être vérifiée."
        : serviceState.routeEnabled !== true
          ? "La route Worker est desactivee."
          : workerAvailable
            ? "Route authentifiee et configuration serveur disponibles."
            : "Route authentifiee disponible, mais les secrets du fournisseur ne sont pas encore configures."
    });
  }

  const checks = Object.freeze([...(Array.isArray(report.checks) ? report.checks : []), workerCheck]);
  const failed = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  return Object.freeze({
    ...report,
    status: failed ? "critical" : warnings ? "warning" : report.status,
    checks,
    failed,
    warnings,
    workerVerified,
    workerAvailable,
    workerService: service,
    workerRequestId: workerVerified ? String(response.meta.requestId).slice(0, 80) : "",
    workerLatencyMs: workerVerified ? Math.max(0, Number(response.meta.latencyMs) || 0) : null
  });
}
