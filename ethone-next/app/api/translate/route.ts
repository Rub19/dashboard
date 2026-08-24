"use server";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not configured");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  if (!genAI) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a professional software localizer for ETHONE OS. Translate the following entire JSON dictionary into ${target}. Maintain identical JSON keys, structure, placeholders, and markdown formatting. Return strictly valid JSON.\n\n${JSON.stringify(source, null, 2)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;

    return NextResponse.json({ translation: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    console.error("Gemini translate error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
