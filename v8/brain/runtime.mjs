import { sanitizeBrainPreferences } from "./préférences.mjs";
import { createBrainContextEngine } from "./context-engine.mjs";
import { createBrainActionRegistry } from "./action-registry.mjs";
import { createBrainMemoryRepository } from "./memory-repository.mjs";
import { createBrainProviderManager } from "./provider-manager.mjs";
import { createBrainController } from "./controller.mjs";

export function createBrainRuntime(options = {}) {
  const getState = typeof options.getState === "function" ? options.getState : () => ({});
  const getPreferences = () => sanitizeBrainPreferences(getState().brainPreferences);
  const context = createBrainContextEngine({ repository: options.repository, getState });
  const actions = createBrainActionRegistry({ repository: options.repository, actions: options.actions, getPreferences, externalServices: options.externalServices });
  const memory = createBrainMemoryRepository({ runtime: options.runtime || globalThis, clientProvider: options.clientProvider, ownerId: options.ownerId, getPreferences });
  const providers = createBrainProviderManager({ runtime: options.runtime || globalThis, getPreferences, transport: options.providerTransport });
  const controller = createBrainController({ contextEngine: context, providerManager: providers, actionRegistry: actions, getPreferences, presence: options.presence });
  let destroyed = false;
  function destroy() { if (destroyed) return false; destroyed = true; controller.destroy(); memory.destroy(); return true; }
  return Object.freeze({ context, actions, memory, providers, controller, preferences: getPreferences, diagnostics: () => Object.freeze({ context: context.diagnostics(), actions: actions.diagnostics(), memory: memory.diagnostics(), providers: providers.diagnostics(), controller: controller.diagnostics() }), destroy });
}
