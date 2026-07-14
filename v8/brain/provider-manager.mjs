const PROVIDERS = Object.freeze([
  Object.freeze({ id: "context", label: "ETHONE Context", kind: "local", privacy: "Aucune donnee envoyee", models: Object.freeze(["context-v1"]) }),
  Object.freeze({ id: "openai", label: "OpenAI", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "anthropic", label: "Anthropic", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "groq", label: "Groq", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "gemini", label: "Gemini", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "ollama", label: "Ollama", kind: "local", privacy: "Pont local requis", models: Object.freeze(["local-model"]) }),
  Object.freeze({ id: "lm-studio", label: "LM Studio", kind: "local", privacy: "Pont local requis", models: Object.freeze(["local-model"]) })
]);

function response(ok, status, message, data = null) { return Object.freeze({ ok, status, message, data }); }

export function createBrainProviderManager(options = {}) {
  const runtime = options.runtime || globalThis;
  const transport = typeof options.transport === "function" ? options.transport : null;
  const getPreferences = typeof options.getPreferences === "function" ? options.getPreferences : () => ({ provider: { active: "context", model: "context-v1", fallback: "context" } });
  const controllers = new Set();
  let requests = 0;
  let probes = 0;
  let failures = 0;
  let lastLatencyMs = null;
  let lastError = "";

  function statuses() {
    return Object.freeze(PROVIDERS.map((provider) => Object.freeze({
      ...provider,
      available: provider.id === "context" || Boolean(transport),
      status: provider.id === "context" ? "ready" : transport ? "backend-ready" : "backend-required"
    })));
  }

  async function complete(input = {}) {
    const preferences = getPreferences()?.provider || {};
    const provider = PROVIDERS.find((entry) => entry.id === preferences.active) || PROVIDERS[0];
    if (provider.id === "context") return response(false, "local-context", "Le Context Engine traite cette demande localement.");
    if (!transport) return response(false, "unavailable", `${provider.label} requiert une route backend securisee. Aucune cle n'est acceptee dans le navigateur.`);
    const controller = new AbortController();
    controllers.add(controller);
    const timeoutMs = Math.max(1000, Math.min(30000, Number(input.timeoutMs) || 12000));
    const timer = typeof runtime.setTimeout === "function" ? runtime.setTimeout(() => controller.abort(new Error("Le provider Brain a expire.")), timeoutMs) : null;
    const startedAt = Date.now();
    requests += 1;
    try {
      const data = await transport(Object.freeze({ provider: provider.id, model: String(preferences.model || provider.models[0]), messages: input.messages, context: input.context, signal: controller.signal }));
      lastLatencyMs = Date.now() - startedAt;
      lastError = "";
      return response(true, "completed", "Reponse du provider recue.", data);
    } catch (error) {
      failures += 1;
      lastLatencyMs = Date.now() - startedAt;
      lastError = String(error?.message || "Provider indisponible.").slice(0, 200);
      return response(false, controller.signal.aborted ? "aborted" : "failed", lastError, error);
    } finally {
      if (timer !== null) runtime.clearTimeout?.(timer);
      controllers.delete(controller);
    }
  }

  async function testConnection(providerId, options = {}) {
    const provider = PROVIDERS.find((entry) => entry.id === String(providerId || ""));
    if (!provider) return response(false, "invalid", "Provider Brain inconnu.");
    if (provider.id === "context") return response(true, "ready", "ETHONE Context est disponible localement.", { provider: provider.id, latencyMs: 0 });
    if (!transport) return response(false, "unavailable", `${provider.label} requiert le backend ETHONE securise.`);
    const controller = new AbortController();
    controllers.add(controller);
    probes += 1;
    const timeoutMs = Math.max(1000, Math.min(15000, Number(options.timeoutMs) || 5000));
    const timer = typeof runtime.setTimeout === "function" ? runtime.setTimeout(() => controller.abort(new Error("Le test provider a expire.")), timeoutMs) : null;
    const startedAt = Date.now();
    try {
      await transport(Object.freeze({ operation: "diagnostic", provider: provider.id, signal: controller.signal }));
      const latencyMs = Date.now() - startedAt;
      lastLatencyMs = latencyMs;
      lastError = "";
      return response(true, "ready", `${provider.label} est disponible.`, { provider: provider.id, latencyMs });
    } catch (error) {
      failures += 1;
      lastLatencyMs = Date.now() - startedAt;
      lastError = String(error?.message || "Provider indisponible.").slice(0, 200);
      return response(false, controller.signal.aborted ? "aborted" : "failed", lastError, error);
    } finally {
      if (timer !== null) runtime.clearTimeout?.(timer);
      controllers.delete(controller);
    }
  }

  function cancelActive(reason = "Requete Brain remplacee.") {
    controllers.forEach((controller) => controller.abort(new Error(reason)));
    controllers.clear();
  }

  function destroy() { cancelActive("Brain ferme."); }

  return Object.freeze({ complete, testConnection, providers: statuses, cancelActive, diagnostics: () => Object.freeze({ requests, probes, failures, lastLatencyMs, lastError, activeRequests: controllers.size, retries: 0, frontendSecretsAccepted: false }), destroy });
}
