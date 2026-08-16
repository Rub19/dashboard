import { NextResponse } from "next/server";

export const runtime = "edge";

const CLOUDFLARE_MODEL = "@cf/meta/llama-3.3-70b-instruct-v1";
const GROK_MODEL = "grok-beta";

function buildCloudflareBody(messages: unknown[]) {
  return JSON.stringify({ messages, stream: true });
}

function buildGrokBody(messages: unknown[]) {
  return JSON.stringify({
    model: GROK_MODEL,
    messages,
    stream: true,
    temperature: 0.4,
    max_tokens: 1024,
  });
}

export async function POST(req: Request) {
  const { messages } = (await req.json().catch(() => ({}))) as { messages?: unknown[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const cfToken = process.env.CLOUDFLARE_AI_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "";
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";

  const systemMessage = {
    role: "system",
    content:
      "Tu es Brain, l'assistant intégré à ETHONE OS. Réponds en français, de manière concise, utile et proactive. Propose des actions concrètes quand c'est pertinent.",
  };
  const fullMessages = [systemMessage, ...messages];

  // 1. Tentative Cloudflare Workers AI
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
          body: buildCloudflareBody(fullMessages),
        }
      );
      clearTimeout(timeout);

      if (cfResponse.ok && cfResponse.body) {
        return new Response(cfResponse.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "X-Provider": "cloudflare-workers-ai",
            "Cache-Control": "no-cache",
          },
        });
      }

      if (cfResponse.status === 429 || !cfResponse.ok) {
        console.warn("Cloudflare Workers AI quota / limit atteinte. Bascule vers Grok...", cfResponse.status);
      }
    } catch (err) {
      console.warn("Erreur Cloudflare AI, bascule vers Grok :", err);
    }
  }

  // 2. Fallback automatique vers xAI Grok
  if (grokKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${grokKey}`,
          "Content-Type": "application/json",
        },
        body: buildGrokBody(fullMessages),
      });
      clearTimeout(timeout);

      if (!grokResponse.ok) {
        const errorText = await grokResponse.text().catch(() => "");
        return NextResponse.json({ error: `Grok indisponible : ${grokResponse.status} ${errorText}` }, { status: 502 });
      }

      if (grokResponse.body) {
        return new Response(grokResponse.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "X-Provider": "grok",
            "Cache-Control": "no-cache",
          },
        });
      }
    } catch {
      return NextResponse.json({ error: "Tous les providers IA sont actuellement indisponibles." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Aucun provider IA configuré." }, { status: 503 });
}
