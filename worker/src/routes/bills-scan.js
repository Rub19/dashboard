import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";

const MAX_BYTES = 5 * 1024 * 1024;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function billsScanRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);

  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.startsWith("multipart/form-data")) {
    throw httpError("INVALID_REQUEST", 400);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }

  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw httpError("INVALID_PARAMETER", 400);
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    throw httpError("UPSTREAM_INVALID_RESPONSE", 413);
  }

  const mime = file.type || "image/jpeg";
  const base64 = arrayBufferToBase64(buffer);

  if (!env.OPENAI_API_KEY) {
    return {
      data: {
        label: "",
        amount: 0,
        currency: "€",
        category: "",
        dueDate: "",
        note: "OPENAI_API_KEY manquante",
      },
    };
  }

  const response = await requestExternal(new URL("https://api.openai.com/v1/chat/completions"), {
    env,
    expectedOrigin: "https://api.openai.com",
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu es un OCR pour factures. Extrais le fournisseur, le montant, la devise, la catégorie et la prochaine date d'échéance.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Réponds uniquement en JSON avec: {label(string), amount(number), currency(string EUR/USD/GBP ou symbole), category(string subscriptions/utilities/transport/health/insurance/housing/food/education/taxes/other), dueDate(YYYY-MM-DD)}. Si tu ne trouves pas une valeur, utilise une chaîne vide ou 0.",
            },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
    maxBytes: 8192,
    timeoutMs: 20000,
  });

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) return { data: {} };

  let parsed;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    parsed = {};
  }

  const categorySet = new Set([
    "housing",
    "utilities",
    "transport",
    "health",
    "insurance",
    "subscriptions",
    "food",
    "education",
    "taxes",
    "other",
  ]);

  return {
    data: {
      label: String(parsed.label || ""),
      amount: Number(parsed.amount) || 0,
      currency: String(parsed.currency || "€").toUpperCase(),
      category: categorySet.has(parsed.category) ? parsed.category : "other",
      dueDate: String(parsed.dueDate || ""),
    },
  };
}
