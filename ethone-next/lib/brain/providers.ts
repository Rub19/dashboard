import { fetchWorker } from "@/lib/api";
import { type BrainProvider } from "./preferences";

export const BRAIN_PROVIDERS = Object.freeze([
  Object.freeze({ id: "cloudflare", label: "Cloudflare Workers AI", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["@cf/meta/llama-3.3-70b-instruct-v1"]) }),
  Object.freeze({ id: "context", label: "ETHONE Context", kind: "local", privacy: "Aucune donnée envoyée", models: Object.freeze(["context-v1"]) }),
  Object.freeze({ id: "openai", label: "OpenAI", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "anthropic", label: "Anthropic", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "groq", label: "Groq", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it", "llama3-70b-8192", "llama3-8b-8192"]) }),
  Object.freeze({ id: "gemini", label: "Gemini", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "deepseek", label: "DeepSeek", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "openrouter", label: "OpenRouter", kind: "cloud", privacy: "Via backend ETHONE", models: Object.freeze(["configure-via-worker"]) }),
  Object.freeze({ id: "ollama", label: "Ollama", kind: "local", privacy: "Pont local requis", models: Object.freeze(["local-model"]) }),
  Object.freeze({ id: "lm-studio", label: "LM Studio", kind: "local", privacy: "Pont local requis", models: Object.freeze(["local-model"]) }),
]);

const BACKEND_READY = new Set(["cloudflare", "groq", "openai", "anthropic", "gemini", "deepseek", "openrouter", "ollama", "lm-studio"]);

export function brainProviderList() {
  return BRAIN_PROVIDERS.map((provider) => ({
    ...provider,
    available: BACKEND_READY.has(provider.id),
    status: provider.id === "context" ? "ready" : BACKEND_READY.has(provider.id) ? "backend-ready" : "backend-required",
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
      provider: input.provider,
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
      provider,
      operation: "diagnostic",
      baseUrl,
    }),
  });
}

export async function aiStatus() {
  return fetchWorker("/api/ai/status");
}

export async function aiQuota() {
  return fetchWorker("/api/ai/quota");
}
