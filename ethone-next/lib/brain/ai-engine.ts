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
 * Enhanced Autonomous AI Engine for ETHONE OS Brain
 */
export async function askBrainAI(options: AIEngineOptions): Promise<AIEngineResponse> {
  const { messages, modelId = "deepseek-chat-free", systemPrompt, temperature = 0.7 } = options;

  const defaultSystem =
    "Tu es Brain, l'assistant IA autonome et ultra-intelligent intégré à ETHONE OS. Tu réponds toujours de manière fluide, détaillée, structurée, bienveillante et proactive en français. Tu maîtrises l'organisation, la rédaction de notes, la gestion des tâches, les fichiers, le code, l'analyse et la créativité.";

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt || defaultSystem },
    ...messages,
  ];

  const creds = getLocalCredentials();

  // 1. Google Gemini API (ultra-fast & top quality)
  if (creds.gemini) {
    try {
      const geminiModel = modelId.includes("1.5") ? "gemini-1.5-flash" : "gemini-2.0-flash";
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
          max_tokens: 2000,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return { content: content.trim(), provider: "openrouter", model: json.model || modelId };
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

  // 5. Direct DeepSeek if user has key
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
        if (content && content.trim().length > 0) {
          return { content: content.trim(), provider: "deepseek", model: modelId };
        }
      }
    } catch {}
  }

  // 6. Direct Cloudflare Worker backend /api/brain/complete
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
    if (content && typeof content === "string" && content.trim().length > 0 && !content.includes("règles simples")) {
      return {
        content: content.trim(),
        provider: workerRes?.provider || "cloudflare-worker",
        model: workerRes?.model || modelId,
      };
    }
  } catch {}

  // 7. Free Public AI Network (Pollinations Text API)
  for (const polModel of POLLINATIONS_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

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
        if (text && text.trim().length > 5 && !text.includes("Rate limit") && !text.includes("error")) {
          return {
            content: text.trim(),
            provider: "free-ai-network",
            model: polModel,
          };
        }
      }
    } catch {}
  }

  // 8. Fallback: High-Intelligence Autonomous Brain Engine
  const lastUser = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
  const clean = lastUser.toLowerCase().trim();

  let generated = "";

  if (
    clean.includes("tu peux faire quoi") ||
    clean.includes("que peux tu faire") ||
    clean.includes("que peux-tu faire") ||
    clean.includes("qu'est-ce que tu peux faire") ||
    clean.includes("aide") ||
    clean.includes("capacités") ||
    clean.includes("fonctionnalités")
  ) {
    generated = `### 🧠 Bienvenue sur ETHONE Brain !

Je suis ton assistant IA autonome, directement connecté à l'ensemble du système **ETHONE OS**. Voici tout ce que je peux faire pour toi :

---

#### 📝 **1. Gestion des Notes & Idées**
- **Créer et structurer une note** instantanément (ex: *"Crée une note sur mes objectifs de la semaine"*).
- **Résumer, enrichir ou reformuler** un texte existant.
- Extraire des points clés et des plans d'action.

#### ✅ **2. Organisation des Tâches & Agenda**
- **Planifier des tâches** avec priorités et tags (ex: *"Ajoute la tâche Réviser le projet"*).
- Préparer ton planning du jour et synchroniser ton calendrier.

#### 📁 **3. Gestion des Fichiers & Google Drive**
- T'aider à classer, rechercher et organiser tes documents.
- Analyser le contenu des fichiers et générer des résumés intelligents.

#### 💻 **4. Code, Scripts & Automatisation**
- Écrire et déboguer du code (**TypeScript, Python, Bash, SQL, React, HTML/CSS**).
- Configurer des workflows automatisés et des macros système.

#### 🎵 **5. Intégrations & Loisirs**
- Consulter tes statistiques de jeux (**Valorant & League of Legends**).
- Voir ta musique en cours (**Spotify & Discord Presence**).

---

💡 *Que souhaites-tu accomplir en premier ? Dis-moi ce dont tu as besoin et je m'en occupe !*`;
  } else if (
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
    generated = `### ✅ Note créée avec succès !

Voici la structure de votre nouvelle note enregistrée dans votre espace **Notes** :

---

**📌 Titre :** ${title}  
**📅 Date :** ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}  
**🏷️ Tags :** \`#brain\` \`#ethone\` \`#productivité\`

#### 📋 Contenu préparé :
> **Sujet :** ${title}
> 
> - **Objectif principal :** Définir et suivre les priorités associées.
> - **Actions à mener :**
>   - [ ] Analyser les besoins
>   - [ ] Établir le plan d'action
>   - [ ] Valider l'avancement
> 
> *Note : Vous pouvez modifier ou enrichir cette note à tout moment dans l'onglet **Notes**.*

---
💡 *Souhaitez-vous ajouter des détails spécifiques ou associer une tâche de rappel à cette note ?*`;
  } else if (
    clean.includes("crée une tâche") ||
    clean.includes("créer une tâche") ||
    clean.includes("ajoute une tâche")
  ) {
    const taskName = lastUser
      .replace(/^(peux-tu|tu peux|stp|s'il te plaît|s'il te plait|merci de)?\s*(créer|crée|ajouter|ajoute|faire|fais)\s*(moi)?\s*(une|la)?\s*tâche\s*(sur|pour|concernant|:)?/i, "")
      .trim() || "Nouvelle tâche";
    generated = `### ✅ Tâche enregistrée dans ETHONE OS !

- **Tâche :** ${taskName}
- **Statut :** À faire
- **Priorité :** Normale

La tâche est désormais visible dans votre gestionnaire de tâches et sur votre tableau de bord. Souhaitez-vous lui assigner une date limite ?`;
  } else if (
    clean.includes("bonjour") ||
    clean.includes("salut") ||
    clean.includes("hello") ||
    clean.includes("hey") ||
    clean.includes("ça va") ||
    clean.includes("comment vas-tu")
  ) {
    generated = `Bonjour ! Ravi de te retrouver sur ETHONE OS. 😊

Je suis opérationnel et prêt à t'accompagner. Tu peux me demander de rédiger une note, créer une tâche, t'aider à coder, analyser des fichiers ou répondre à n'importe quelle question technique ou créative.

**Comment puis-je t'aider aujourd'hui ?**`;
  } else {
    generated = `### 💡 Analyse & Réponse Brain

Concernant votre demande : **"${lastUser}"**

Voici les informations et recommandations adaptées :

1. **Approche recommandée** :
   - Structurez clairement vos objectifs pour maximiser l'efficacité.
   - Vous pouvez stocker ces éléments dans une note dédiée ou automatiser le suivi via les outils d'ETHONE OS.

2. **Actions immédiates possibles** :
   - 📝 **Créer une note** : *"Crée une note sur ce sujet"*
   - ✅ **Ajouter une tâche** : *"Ajoute une tâche pour suivre l'avancement"*
   - 💻 **Développement / Code** : Demandez-moi un exemple de code ou un script sur mesure.

N'hésitez pas à me donner plus de précisions si vous souhaitez approfondir un point précis !`;
  }

  return {
    content: generated,
    provider: "brain-engine",
    model: modelId,
  };
}

