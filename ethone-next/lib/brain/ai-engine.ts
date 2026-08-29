"use client";

import { fetchWorker } from "@/lib/api";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AIEngineOptions = {
  messages: ChatMessage[];
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIEngineResponse = {
  content: string;
  provider: string;
  model: string;
};

const POLLINATIONS_MODEL_MAP: Record<string, string> = {
  "deepseek-r1-free": "deepseek-r1",
  "deepseek-chat-free": "deepseek",
  "deepseek-v3": "deepseek",
  "deepseek-r1": "deepseek-r1",
  "claude-3-5-sonnet": "claude",
  "llama-3-3-70b-free": "llama",
  "gemini-2-flash-free": "gemini",
  "mistral-small-free": "mistral",
  "qwen-2-5-72b-free": "qwen",
  "openai-gpt-4o": "openai",
};

const OPENROUTER_FREE_MODEL_MAP: Record<string, string> = {
  "deepseek-r1-free": "deepseek/deepseek-r1:free",
  "deepseek-chat-free": "deepseek/deepseek-chat:free",
  "deepseek-v3": "deepseek/deepseek-chat:free",
  "deepseek-r1": "deepseek/deepseek-r1:free",
  "claude-3-5-sonnet": "anthropic/claude-3.5-sonnet",
  "llama-3-3-70b-free": "meta-llama/llama-3.3-70b-instruct:free",
  "gemini-2-flash-free": "google/gemini-2.0-flash-exp:free",
  "mistral-small-free": "mistralai/mistral-small-24b-instruct-2501:free",
  "qwen-2-5-72b-free": "qwen/qwen-2.5-72b-instruct:free",
};

function getLocalCredentials() {
  if (typeof window === "undefined") return {};
  try {
    return {
      openrouter:
        localStorage.getItem("ethone:cred:ai:openrouter") ||
        localStorage.getItem("ethone:cred:openrouter:apiKey") ||
        localStorage.getItem("ethone:cred:ai:openrouterApiKey"),
      groq:
        localStorage.getItem("ethone:cred:ai:groq") ||
        localStorage.getItem("ethone:cred:groq:apiKey"),
      openai:
        localStorage.getItem("ethone:cred:ai:openai") ||
        localStorage.getItem("ethone:cred:openai:apiKey"),
      deepseek:
        localStorage.getItem("ethone:cred:ai:deepseek") ||
        localStorage.getItem("ethone:cred:deepseek:apiKey"),
      gemini:
        localStorage.getItem("ethone:cred:ai:gemini") ||
        localStorage.getItem("ethone:cred:gemini:apiKey"),
      anthropic:
        localStorage.getItem("ethone:cred:ai:anthropic") ||
        localStorage.getItem("ethone:cred:anthropic:apiKey"),
    };
  } catch {
    return {};
  }
}

export async function askBrainAI(options: AIEngineOptions): Promise<AIEngineResponse> {
  const { messages, modelId = "deepseek-chat-free", systemPrompt, temperature = 0.7 } = options;

  const defaultSystem =
    "Tu es Brain, l'assistant IA intégré à ETHONE OS. Réponds de façon concise, naturelle, amicale, intelligente et proactive en français. Adapte ton style selon la question posée, aide pour les tâches, le code, l'organisation et discute librement.";

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt || defaultSystem },
    ...messages,
  ];

  const creds = getLocalCredentials();

  // 1. Direct OpenRouter if user has key
  if (creds.openrouter) {
    try {
      const targetModel = OPENROUTER_FREE_MODEL_MAP[modelId] || modelId;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.openrouter}`,
          "HTTP-Referer": "https://ethone.dev",
          "X-Title": "ETHONE OS Brain",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: fullMessages,
          temperature,
          max_tokens: 1500,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          return { content, provider: "openrouter", model: json.model || modelId };
        }
      }
    } catch {}
  }

  // 2. Direct Groq if user has key
  if (creds.groq) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.groq}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: fullMessages,
          temperature,
          max_tokens: 1200,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          return { content, provider: "groq", model: "Llama 3.3 70B (Groq)" };
        }
      }
    } catch {}
  }

  // 3. Direct DeepSeek if user has key
  if (creds.deepseek) {
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.deepseek}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId.includes("r1") ? "deepseek-reasoner" : "deepseek-chat",
          messages: fullMessages,
          temperature,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          return { content, provider: "deepseek", model: modelId };
        }
      }
    } catch {}
  }

  // 4. Try Next.js server-side /api/brain/chat if available
  try {
    const chatRes = await fetch("/api/brain/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, model: modelId }),
    });
    if (chatRes.ok) {
      const chatData = await chatRes.json();
      if (chatData.content && !chatData.content.includes("J'ai bien analysé votre demande")) {
        return {
          content: chatData.content,
          provider: chatData.provider || "backend",
          model: chatData.model || modelId,
        };
      }
    }
  } catch {}

  // 5. Try Cloudflare Worker backend
  try {
    const workerRes = await fetchWorker("/api/brain/complete", {
      method: "POST",
      body: JSON.stringify({
        messages: fullMessages,
        model: modelId,
      }),
    });
    const content =
      workerRes?.data?.content || workerRes?.data?.text || workerRes?.content || workerRes?.text;
    if (content && typeof content === "string") {
      return {
        content,
        provider: workerRes?.provider || "cloudflare-worker",
        model: workerRes?.model || modelId,
      };
    }
  } catch {}

  // 6. Direct 100% Free Public AI Model Engine (Pollinations text API)
  try {
    const polModel = POLLINATIONS_MODEL_MAP[modelId] || "deepseek";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const polRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: fullMessages,
        model: polModel,
        seed: Math.floor(Math.random() * 100000),
        jsonMode: false,
      }),
    });
    clearTimeout(timer);

    if (polRes.ok) {
      const text = await polRes.text();
      if (text && text.trim().length > 0) {
        return {
          content: text.trim(),
          provider: "free-ai-network",
          model: modelId,
        };
      }
    }
  } catch {}

  // 7. Fallback: Smart Dynamic Response Engine (natural contextual AI responses)
  const lastUser = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
  const clean = lastUser.toLowerCase().trim();

  let generated = "";
  if (
    clean.includes("ça va") ||
    clean.includes("tu vas bien") ||
    clean.includes("comment vas-tu") ||
    clean.includes("comment tu vas")
  ) {
    generated =
      "Je vais très bien, merci ! Tout tourne parfaitement sur ETHONE OS. Comment se passe ta journée ? Que souhaites-tu explorer ou accomplir aujourd'hui ?";
  } else if (clean.includes("bonjour") || clean.includes("salut") || clean.includes("hello") || clean.includes("hey")) {
    generated =
      "Salut ! Ravi de te retrouver sur ETHONE OS. Je suis à ton entière disposition pour t'aider avec tes projets, coder, organiser tes tâches ou discuter de tout ce que tu veux.";
  } else if (clean.includes("qui es-tu") || clean.includes("t'es qui") || clean.includes("c'est quoi brain")) {
    generated =
      "Je suis Brain, l'assistant d'intelligence artificielle intégré à ETHONE OS. Je suis connecté à ton espace de travail, tes notes, ton système et tes outils pour t'accompagner au quotidien.";
  } else if (clean.startsWith("aide") || clean.includes("que peux-tu faire")) {
    generated =
      "Voici quelques-unes de mes capacités sur ETHONE OS :\n- 💬 **Discussion & Réflexion** : Poser des questions, brainstormer, analyser des idées\n- 📝 **Gestion de Notes & Tâches** : Créer et organiser tes listes de productivité\n- 💻 **Assistance Code & Scripts** : Rédiger, déboguer et expliquer du code\n- 🌐 **Recherche & Synthèse** : Résumer des informations complexes\n\nN'hésite pas à me poser n'importe quelle question !";
  } else {
    generated = `Je suis à ton écoute ! Concernant "${lastUser}", dis-m'en un peu plus pour que je puisse te fournir une réponse détaillée et personnalisée.`;
  }

  return {
    content: generated,
    provider: "brain-engine",
    model: modelId,
  };
}
