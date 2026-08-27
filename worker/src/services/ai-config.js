export const AI_PROVIDERS = Object.freeze({
  context: Object.freeze({
    id: "context",
    label: "ETHONE Context",
    kind: "local",
    isPrimary: false,
    defaultModel: "context-v1",
    fallbackModels: Object.freeze([]),
    maxTokens: 256,
    maxContextChars: 4000,
    maxOutputChars: 1000,
    timeoutMs: 5000,
    retryable: false,
    maxRetries: 0,
    priority: 0,
  }),
  cloudflare: Object.freeze({
    id: "cloudflare",
    label: "Cloudflare Workers AI",
    kind: "cloud",
    isPrimary: true,
    defaultModel: "@cf/meta/llama-3.3-70b-instruct-v1",
    fallbackModels: Object.freeze([
      "@cf/meta/llama-3.1-8b-instruct-v1",
      "@cf/meta/llama-3.1-70b-instruct-v1"
    ]),
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 10,
  }),
  openai: Object.freeze({
    id: "openai",
    label: "OpenAI",
    kind: "cloud",
    defaultModel: "gpt-4o-mini",
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 20,
  }),
  anthropic: Object.freeze({
    id: "anthropic",
    label: "Anthropic",
    kind: "cloud",
    defaultModel: "claude-3-haiku-20240307",
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 30,
  }),
  gemini: Object.freeze({
    id: "gemini",
    label: "Google Gemini",
    kind: "cloud",
    defaultModel: "gemini-1.5-flash",
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 40,
  }),
  groq: Object.freeze({
    id: "groq",
    label: "Groq",
    kind: "cloud",
    defaultModel: "llama-3.3-70b-versatile",
    allowedModels: Object.freeze(new Set([
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "gemma2-9b-it",
    ])),
    fallbackModels: Object.freeze([
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
    ]),
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 50,
  }),
  deepseek: Object.freeze({
    id: "deepseek",
    label: "DeepSeek",
    kind: "cloud",
    defaultModel: "deepseek-chat",
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 60,
  }),
  xai: Object.freeze({
    id: "xai",
    label: "xAI Grok",
    kind: "cloud",
    defaultModel: "grok-beta",
    allowedModels: Object.freeze(new Set(["grok-beta", "grok-2"])),
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 55,
  }),
  openrouter: Object.freeze({
    id: "openrouter",
    label: "OpenRouter Free",
    kind: "cloud",
    defaultModel: "deepseek/deepseek-chat:free",
    maxTokens: 1500,
    maxContextChars: 16000,
    maxOutputChars: 4000,
    timeoutMs: 20000,
    retryable: true,
    maxRetries: 0,
    priority: 70,
  }),
  ollama: Object.freeze({
    id: "ollama",
    label: "Ollama",
    kind: "local",
    defaultModel: "local-model",
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 80,
  }),
  "lm-studio": Object.freeze({
    id: "lm-studio",
    label: "LM Studio",
    kind: "local",
    defaultModel: "local-model",
    maxTokens: 1024,
    maxContextChars: 12000,
    maxOutputChars: 4000,
    timeoutMs: 15000,
    retryable: true,
    maxRetries: 0,
    priority: 90,
  }),
});

export const AI_PROVIDER_LIST = Object.freeze(Object.values(AI_PROVIDERS));

export function aiProviderById(id) {
  const provider = AI_PROVIDERS[id];
  if (!provider) return null;
  return provider;
}

export function resolveAiConfig(env) {
  const cloudflareAllocation = Number(env.AI_CLOUDFLARE_DAILY_ALLOCATION || 10000);
  const internalBudget = Math.min(
    cloudflareAllocation,
    Number(env.AI_CLOUDFLARE_DAILY_BUDGET || Math.floor(cloudflareAllocation * 0.8))
  );
  const emergencyBuffer = Math.max(
    0,
    Number(env.AI_CLOUDFLARE_EMERGENCY_BUFFER || Math.floor(cloudflareAllocation * 0.2))
  );
  const warningThreshold = Math.min(1, Math.max(0, Number(env.AI_CLOUDFLARE_WARNING_PCT || 0.8)));
  const prepareThreshold = Math.min(1, Math.max(0, Number(env.AI_CLOUDFLARE_PREPARE_PCT || 0.9)));
  const hardStopThreshold = Math.min(1, Math.max(0, Number(env.AI_CLOUDFLARE_HARDSTOP_PCT || 1.0)));
  const neuronsPerToken = Math.max(0.0001, Number(env.AI_NEURONS_PER_TOKEN || 0.1));

  return Object.freeze({
    primaryProvider: env.AI_PRIMARY_PROVIDER || "cloudflare",
    primaryModel: env.AI_PRIMARY_MODEL || AI_PROVIDERS.cloudflare.defaultModel,
    fallbackProvider: env.AI_FALLBACK_PROVIDER || "groq",
    fallbackModel: env.AI_FALLBACK_MODEL || AI_PROVIDERS.groq.defaultModel,
    cloudflare: Object.freeze({
      allocation: cloudflareAllocation,
      budget: internalBudget,
      emergencyBuffer,
      warningThreshold,
      prepareThreshold,
      hardStopThreshold,
      neuronsPerToken,
      accountId: env.CLOUDFLARE_ACCOUNT_ID || "",
      apiToken: env.CLOUDFLARE_API_TOKEN || "",
    }),
    perUser: Object.freeze({
      requestsPerHour: Math.max(1, Number(env.AI_USER_REQUESTS_PER_HOUR || 60)),
      requestsPerDay: Math.max(1, Number(env.AI_USER_REQUESTS_PER_DAY || 500)),
      maxPromptChars: Math.max(1, Number(env.AI_USER_MAX_PROMPT_CHARS || 12000)),
      maxOutputTokens: Math.max(1, Number(env.AI_USER_MAX_OUTPUT_TOKENS || 1024)),
      maxContextChars: Math.max(100, Number(env.AI_USER_MAX_CONTEXT_CHARS || 12000)),
    }),
    retry: Object.freeze({
      maxRetries: Math.max(0, Math.min(1, Number(env.AI_MAX_RETRIES || 0))),
      baseDelayMs: Math.max(0, Number(env.AI_RETRY_BASE_MS || 250)),
    }),
    logging: Object.freeze({
      enabled: env.AI_USAGE_LOGGING_ENABLED !== "false",
      maxLogsPerDay: Math.max(0, Number(env.AI_MAX_LOGS_PER_DAY || 10000)),
    }),
  });
}

export function estimateNeurons(input, output, neuronsPerToken) {
  const inputTokens = Math.ceil(String(input || "").length / 4);
  const outputTokens = Math.ceil(String(output || "").length / 4);
  return Math.max(0, (inputTokens + outputTokens) * neuronsPerToken);
}

export function quotaStatus(used, config) {
  const pct = config.budget > 0 ? used / config.budget : 0;
  return Object.freeze({
    used,
    budget: config.budget,
    allocation: config.allocation,
    emergencyBuffer: config.emergencyBuffer,
    percent: Math.min(1, Math.max(0, pct)),
    warning: pct >= config.warningThreshold && pct < config.prepareThreshold,
    prepare: pct >= config.prepareThreshold && pct < config.hardStopThreshold,
    exhausted: pct >= config.hardStopThreshold,
  });
}
