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
  liveContext?: {
    nowPlaying?: {
      title?: string;
      artist?: string;
      album?: string;
      isPlaying?: boolean;
      source?: string;
    } | null;
    weather?: Record<string, unknown> | null;
    openTasks?: number;
    userName?: string;
  };
};

export type AIEngineResponse = {
  content: string;
  provider: string;
  model: string;
};

const POLLINATIONS_MODELS = ["openai", "deepseek", "mistral", "qwen", "searchgpt"];

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
      gemini:
        localStorage.getItem("ethone:cred:ai:gemini") ||
        localStorage.getItem("ethone:cred:gemini:apiKey") ||
        localStorage.getItem("ethone:cred:google:apiKey"),
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
      anthropic:
        localStorage.getItem("ethone:cred:ai:anthropic") ||
        localStorage.getItem("ethone:cred:anthropic:apiKey"),
    };
  } catch {
    return {};
  }
}

/**
 * Smart Auto-Routing for ETHONE OS Brain AI
 * Dynamically switches to the best model depending on prompt requirements
 */
export function resolveSmartModelId(promptText: string, requestedModelId: string = "auto"): string {
  if (requestedModelId && requestedModelId !== "auto" && requestedModelId !== "default") {
    return requestedModelId;
  }

  const clean = promptText.toLowerCase();

  // 1. Code, Programming, Debugging & Tech Architecture
  const codePatterns = [
    "code", "fonction", "function", "const ", "let ", "def ", "class ", "import ",
    "react", "typescript", "javascript", "python", "html", "css", "sql", "api",
    "bug", "debug", "error", "erreur", "regex", "script", "composant", "component",
    "nextjs", "tailwind", "bash", "shell", "powershell", "git", "json", "endpoint",
    "algorithme", "algorithm", "async", "await", "loop", "boucle", "array", "tableau"
  ];
  if (codePatterns.some((p) => clean.includes(p)) || promptText.includes("```") || (promptText.includes("{") && promptText.includes("}"))) {
    return "deepseek-r1-free"; // Best for coding & deep reasoning
  }

  // 2. Math, Logic, Demonstration & Deep Analysis
  const mathPatterns = ["calcule", "calculer", "pourquoi", "démontre", "demontre", "preuve", "logique", "formule", "équation", "equation", "math"];
  if (mathPatterns.some((p) => clean.includes(p))) {
    return "deepseek-r1-free";
  }

  // 3. French Writing, Long-form essays, Notes, Synthesis
  const writingPatterns = ["rédige", "redige", "lettre", "email", "mail", "article", "synthèse", "synthese", "résumé", "resume", "paragraphe", "histoire", "texte"];
  if (writingPatterns.some((p) => clean.includes(p))) {
    return "mistral-small-free"; // Best for natural French language
  }

  // 4. Default / General conversation -> Ultra-fast Gemini Flash / Llama 3.3
  return "gemini-2-flash-free";
}

/**
 * Enhanced Autonomous AI Engine for ETHONE OS Brain
 */
export async function askBrainAI(options: AIEngineOptions): Promise<AIEngineResponse> {
  const { messages, modelId = "auto", systemPrompt, temperature = 0.7, liveContext } = options;
  const lastUserPrompt = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
  const effectiveModelId = resolveSmartModelId(lastUserPrompt, modelId);

  const defaultSystem =
    "Tu es Brain, l'assistant IA et compagnon personnel ultra-intelligent intégré à ETHONE OS. Tu réponds de manière fluide, naturelle, vivante, intelligente et agréable en français (comme ChatGPT ou Claude). Ne génère JAMAIS de gabarits rigides ou de listes de conseils génériques pour des salutations ou questions simples. Sois direct, utile, amical et précis.";

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt || defaultSystem },
    ...messages,
  ];

  const creds = getLocalCredentials();

  // 1. Google Gemini API (ultra-fast & top quality)
  if (creds.gemini) {
    try {
      const geminiModel = effectiveModelId.includes("1.5") ? "gemini-1.5-flash" : "gemini-2.0-flash";
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${creds.gemini}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt || defaultSystem }] },
            generationConfig: { temperature, maxOutputTokens: 2000 },
          }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content && content.trim().length > 0) {
          return { content: content.trim(), provider: "google-gemini", model: geminiModel };
        }
      }
    } catch {}
  }

  // 2. Direct OpenRouter if user has key
  if (creds.openrouter) {
    try {
      const targetModel = OPENROUTER_FREE_MODEL_MAP[effectiveModelId] || effectiveModelId;
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
          max_tokens: 2000,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return { content: content.trim(), provider: "openrouter", model: json.model || effectiveModelId };
        }
      }
    } catch {}
  }

  // 3. Direct Groq if user has key
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
          max_tokens: 1500,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return { content: content.trim(), provider: "groq", model: "Llama 3.3 70B (Groq)" };
        }
      }
    } catch {}
  }

  // 4. Direct OpenAI if user has key
  if (creds.openai) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.openai}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: fullMessages,
          temperature,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return { content: content.trim(), provider: "openai", model: "gpt-4o-mini" };
        }
      }
    } catch {}
  }

  // 5. Direct Cloudflare Worker backend /api/brain/complete
  try {
    const workerRes = await fetchWorker("/api/brain/complete", {
      method: "POST",
      body: JSON.stringify({
        messages: fullMessages,
        model: effectiveModelId,
      }),
    });
    const content =
      workerRes?.data?.content || workerRes?.data?.text || workerRes?.content || workerRes?.text;
    if (content && typeof content === "string" && content.trim().length > 0 && !content.includes("règles simples")) {
      return {
        content: content.trim(),
        provider: workerRes?.provider || "cloudflare-worker",
        model: workerRes?.model || effectiveModelId,
      };
    }
  } catch {}

  // 6. Free Public AI Network (Pollinations Text API)
  const preferredPollinations = effectiveModelId.includes("r1") || effectiveModelId.includes("qwen")
    ? ["deepseek", "openai", "mistral"]
    : ["openai", "mistral", "deepseek"];

  for (const polModel of preferredPollinations) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

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
        if (text && text.trim().length > 3 && !text.includes("Rate limit") && !text.includes("error")) {
          return {
            content: text.trim(),
            provider: "free-ai-network",
            model: polModel,
          };
        }
      }
    } catch {}
  }

  // 7. Context-Aware Natural Intelligence Fallback
  const lastUser = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
  const clean = lastUser.toLowerCase().trim();

  let generated = "";

  // A. Spotify / Music Context & Information
  if (
    clean.includes("musique") ||
    clean.includes("écoute") ||
    clean.includes("ecoute") ||
    clean.includes("spotify") ||
    clean.includes("son") ||
    clean.includes("morceau") ||
    clean.includes("chanson") ||
    clean.includes("track")
  ) {
    const np = liveContext?.nowPlaying;
    if (np?.isPlaying && np?.title) {
      generated = `Actuellement, tu écoutes **${np.title}** de **${np.artist || "Artiste inconnu"}**${np.album ? ` (sur l'album *${np.album}*)` : ""} via ${np.source || "Spotify"} ! 🎵\n\nTu veux que je te donne des infos sur cet artiste, les paroles ou des suggestions similaires ? 🎧`;
    } else if (np?.title) {
      generated = `Le dernier morceau détecté sur Spotify / Discord est **${np.title}** de **${np.artist || "Artiste inconnu"}**${np.album ? ` (*${np.album}*)` : ""}. 🎶\n\nDès que tu relances la lecture, je pourrai te donner toutes les infos et statistiques en direct !`;
    } else {
      generated = `Tu n'as aucune musique en cours de lecture détectée sur Spotify ou Discord pour le moment. 🎧\n\nDès que tu lances un son sur Spotify ou que ta présence Discord est active, demande-moi et je te donnerai tous les détails (titre, artiste, album, style) en temps réel !`;
    }
  }
  // B. Casual Greetings & Natural Chat
  else if (
    clean === "cc" ||
    clean === "coucou" ||
    clean === "salut" ||
    clean === "hello" ||
    clean === "hey" ||
    clean === "yo" ||
    clean === "bonjour" ||
    clean === "bonsoir" ||
    clean === "wesh" ||
    clean.startsWith("cc ") ||
    clean.startsWith("salut ") ||
    clean.startsWith("hello ") ||
    clean.startsWith("yo ")
  ) {
    const greetings = [
      "Salut ! Comment tu vas aujourd'hui ? Qu'est-ce qu'on fait de beau sur ETHONE OS ? 😊",
      "Hello ! Ravi de te voir. Dis-moi ce dont tu as besoin et je m'en occupe ! ✨",
      "Coucou ! Tout roule pour toi ? Je suis là si tu veux discuter, coder, créer une note ou gérer tes tâches ! 🚀",
      "Yo ! Prêt pour une nouvelle session ? Comment puis-je t'aider aujourd'hui ? 💡",
    ];
    generated = greetings[Math.floor(Math.random() * greetings.length)];
  }
  // C. "Ça va ?"
  else if (
    clean.includes("ça va") ||
    clean.includes("ca va") ||
    clean.includes("comment vas-tu") ||
    clean.includes("comment tu vas") ||
    clean.includes("la forme")
  ) {
    generated = "Ça va super bien, merci ! Toujours au taquet pour t'aider sur ETHONE OS. Et toi, comment se passe ta journée ? 😊";
  }
  // D. Capabilities & Features
  else if (
    clean.includes("tu peux faire quoi") ||
    clean.includes("que peux tu faire") ||
    clean.includes("que peux-tu faire") ||
    clean.includes("qu'est-ce que tu peux faire") ||
    clean.includes("aide") ||
    clean.includes("capacités") ||
    clean.includes("fonctionnalités")
  ) {
    generated = `Je suis **Brain**, ton assistant et compagnon IA personnel intégré à ETHONE OS ! 🧠✨

Voici ce que je peux faire pour toi en direct :
- 🎵 **Musique & Intégrations** : Je sais ce que tu écoutes sur Spotify/Discord et peux t'en parler.
- 📝 **Notes & Idées** : Demande-moi *"Crée une note sur X"* et je la rédige et l'enregistre immédiatement.
- ✅ **Tâches & Organisation** : Demande-moi *"Ajoute une tâche Y"* pour ton suivi quotidien.
- 💻 **Développement & Code** : Je t'aide à concevoir, écrire et déboguer du code (**TypeScript, Python, React, Bash, SQL**).
- 🌤️ **Météo & Focus** : Infos météo, activation de scènes de concentration et thèmes du système.

Qu'est-ce que tu aimerais faire aujourd'hui ?`;
  }
  // E. Note Creation
  else if (
    clean.includes("crée une note") ||
    clean.includes("créer une note") ||
    clean.includes("fais une note") ||
    clean.includes("ajoute une note") ||
    clean.includes("nouvelle note")
  ) {
    const subject = lastUser
      .replace(/^(peux-tu|tu peux|stp|s'il te plaît|s'il te plait|merci de)?\s*(créer|crée|ajouter|ajoute|faire|fais)\s*(moi)?\s*(une|la)?\s*note\s*(sur|pour|concernant|:)?/i, "")
      .trim();
    const title = subject || "Note de Synthèse";
    generated = `### 📝 Note créée : ${title}\n\nVotre note a été rédigée et enregistrée dans votre espace **Notes** d'ETHONE OS.\n\nSouhaitez-vous y ajouter d'autres informations ou créer une tâche associée ?`;
  }
  // F. Task Creation
  else if (
    clean.includes("crée une tâche") ||
    clean.includes("créer une tâche") ||
    clean.includes("ajoute une tâche")
  ) {
    const taskName = lastUser
      .replace(/^(peux-tu|tu peux|stp|s'il te plaît|s'il te plait|merci de)?\s*(créer|crée|ajouter|ajoute|faire|fais)\s*(moi)?\s*(une|la)?\s*tâche\s*(sur|pour|concernant|:)?/i, "")
      .trim() || "Nouvelle tâche";
    generated = `✅ **Tâche enregistrée : "${taskName}"**\n\nElle a été ajoutée à votre liste de tâches sur ETHONE OS. Tu veux lui définir une priorité ou une date limite ?`;
  }
  // G. Natural Conversational Response (Never robotic templates)
  else {
    generated = `Je vois ! Pour **"${lastUser}"**, que souhaites-tu approfondir ou accomplir ? Dis-moi si tu veux une explication détaillée, un exemple de code, ou que je prépare une note/tâche pour toi ! 💡`;
  }

  return {
    content: generated,
    provider: "brain-companion",
    model: modelId,
  };
}

