import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CLOUDFLARE_MODEL = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct-v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const MODEL_MAP: Record<string, string> = {
  "deepseek-r1-free": "deepseek/deepseek-r1:free",
  "deepseek-chat-free": "deepseek/deepseek-chat:free",
  "llama-3-3-70b-free": "meta-llama/llama-3.3-70b-instruct:free",
  "gemini-2-flash-free": "google/gemini-2.0-flash-exp:free",
  "mistral-small-free": "mistralai/mistral-small-24b-instruct-2501:free",
  "qwen-2-5-72b-free": "qwen/qwen-2.5-72b-instruct:free",
};

const FREE_FALLBACK_MODELS = [
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "openrouter/free",
];

export async function POST(req: Request) {
  const { messages, model: requestedModel } = (await req.json().catch(() => ({}))) as {
    messages?: { role: string; content: string }[];
    model?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY || "";
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const cfToken = process.env.CLOUDFLARE_AI_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "";
  const groqKey = process.env.GROQ_API_KEY || "";

  const systemMessage = {
    role: "system",
    content:
      "Tu es Brain, l'assistant IA intégré à ETHONE OS. Réponds en français de façon concise, précise, proactive et élégante. Aide l'utilisateur avec ses notes, tâches, code, et organisation de productivité.",
  };
  const fullMessages = [systemMessage, ...messages];

  // 1. Priorité OpenRouter (Modèles 100% Gratuits)
  if (openrouterKey) {
    try {
      const targetModel =
        MODEL_MAP[requestedModel || ""] ||
        requestedModel ||
        "deepseek/deepseek-chat:free";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://ethone.dev",
          "X-Title": "ETHONE OS Brain",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: targetModel,
          models: FREE_FALLBACK_MODELS,
          messages: fullMessages,
          temperature: 0.4,
          max_tokens: 1500,
        }),
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const content =
          data.choices?.[0]?.message?.content ||
          "Je n'ai pas pu générer de réponse.";
        return NextResponse.json({
          content,
          model: data.model || targetModel,
          provider: "openrouter-free",
        });
      }

      console.warn("OpenRouter Free response not ok:", response.status);
    } catch (err) {
      console.warn("Exception OpenRouter, bascule vers providers alternatifs :", err);
    }
  }

  // 2. Fallback Cloudflare Workers AI
  if (accountId && cfToken) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const cfResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_MODEL}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: fullMessages }),
        }
      );
      clearTimeout(timeout);

      if (cfResponse.ok) {
        const data = await cfResponse.json();
        const content = data.result?.response || data.response || "Réponse générée par Cloudflare AI.";
        return NextResponse.json({
          content,
          model: "Llama 3.3 70B (Cloudflare)",
          provider: "cloudflare",
        });
      }
    } catch (err) {
      console.warn("Erreur Cloudflare AI fallback :", err);
    }
  }

  // 3. Fallback Groq
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: fullMessages,
          temperature: 0.4,
          max_tokens: 1024,
        }),
      });
      clearTimeout(timeout);

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const content = data.choices?.[0]?.message?.content || "Réponse Groq.";
        return NextResponse.json({
          content,
          model: "Llama 3.3 70B (Groq)",
          provider: "groq",
        });
      }
    } catch (err) {
      console.warn("Exception Groq fallback :", err);
    }
  }

  // 4. Fallback simulateur de réponse intelligent
  const lastUserMsg = messages[messages.length - 1]?.content || "";
  return NextResponse.json({
    content: `J'ai bien reçu votre demande : "${lastUserMsg}". Brain est opérationnel sur votre espace ETHONE OS.`,
    model: "Brain Local Fallback",
    provider: "local",
  });
}
