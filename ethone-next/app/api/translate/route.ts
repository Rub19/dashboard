"use server";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error("OPENROUTER_API_KEY is not configured");
}

const openai = apiKey
  ? new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://ethone.dev",
        "X-Title": process.env.OPENROUTER_TITLE || "ETHONE OS",
      },
    })
  : null;

const PRIMARY_MODEL = "google/gemma-4-31b-it:free";
const FALLBACK_MODEL = "openrouter/free";

async function translateDictionary(
  model: string,
  target: string,
  source: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!openai) {
    throw new Error("OpenRouter client is not configured");
  }

  const systemPrompt = `You are a professional software localizer for ETHONE OS. Translate the entire provided JSON dictionary into ${target}. Keep the exact identical JSON structure, keys, markdown, and placeholders (such as {{...}}) intact. Return strictly valid JSON with no markdown, no comments, and no extra text.`;
  const userPrompt = `Source dictionary:\n${JSON.stringify(source, null, 2)}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenRouter");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) throw new Error("OpenRouter did not return valid JSON");
    const cleaned = jsonMatch[0]
      .replace(/```(?:json)?\n?/g, "")
      .trim();
    parsed = JSON.parse(cleaned);
  }

  return parsed;
}

export async function POST(request: Request) {
  if (!openai) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { target, source } = (await request.json()) as {
      target?: string;
      source?: Record<string, unknown>;
    };

    if (!target || !source || typeof source !== "object") {
      return NextResponse.json(
        { error: "Both 'target' language and 'source' JSON dictionary are required" },
        { status: 400 }
      );
    }

    try {
      const translation = await translateDictionary(PRIMARY_MODEL, target, source);
      return NextResponse.json({ translation });
    } catch (primaryErr) {
      console.warn("OpenRouter primary model failed, trying fallback:", primaryErr);
      const translation = await translateDictionary(FALLBACK_MODEL, target, source);
      return NextResponse.json({ translation });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    console.error("OpenRouter translate error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
