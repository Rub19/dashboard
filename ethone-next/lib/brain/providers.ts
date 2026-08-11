import { fetchWorker } from "@/lib/api";
import { type BrainProvider } from "./preferences";

export const BRAIN_PROVIDERS = Object.freeze([
  Object.freeze({ id: "context", label: "ETHONE Context", kind: "local", privacy: "Aucune donnée envoyée", models: Object.freeze(["context-v1"]) }),
  Object.freeze({ id: "openai", label: "OpenAI", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "anthropic", label: "Anthropic", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "groq", label: "Groq", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]) }),
  Object.freeze({ id: "gemini", label: "Gemini", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "ollama", label: "Ollama", kind: "local", privacy: "Pont local requis", models: Object.freeze(["local-model"]) }),
  Object.freeze({ id: "lm-studio", label: "LM Studio", kind: "local", privacy: "Pont local requis", models: Object.freeze(["local-model"]) }),
]);

export function brainProviderList() {
  return BRAIN_PROVIDERS.map((provider) => ({
    ...provider,
    available: ["context", "groq", "ollama", "lm-studio"].includes(provider.id),
    status:
      provider.id === "context"
        ? "ready"
        : provider.id === "groq" || provider.id === "ollama" || provider.id === "lm-studio"
        ? "backend-ready"
        : "backend-required",
  }));
}

export async function brainComplete(input: {
  provider: BrainProvider;
  model?: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  context?: Record<string, unknown>;
  baseUrl?: string;
}) {
  return fetchWorker("/api/brain/complete", {
    method: "POST",
    body: JSON.stringify({
      provider: input.provider === "context" ? "groq" : input.provider,
      model: input.model,
      messages: input.messages,
      context: input.context,
      baseUrl: input.baseUrl,
    }),
  });
}

export async function brainDiagnostic(provider: BrainProvider, baseUrl?: string) {
  return fetchWorker("/api/brain/complete", {
    method: "POST",
    body: JSON.stringify({
      provider: provider === "context" ? "groq" : provider,
      operation: "diagnostic",
      baseUrl,
    }),
  });
}
