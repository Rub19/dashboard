"use client";

import { supabase } from "./supabase";

export const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

if (typeof window !== "undefined" && !WORKER_URL) {
  console.error(
    "ETHONE : NEXT_PUBLIC_WORKER_URL est requis. Vérifiez vos variables d'environnement."
  );
}

export class WorkerError extends Error {
  status: number;
  code?: string;
  detail?: unknown;
  retryable?: boolean;

  constructor(message: string, status: number, code?: string, detail?: unknown, retryable?: boolean) {
    super(message);
    this.name = "WorkerError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.retryable = retryable;
  }
}

function extractWorkerErrorDetail(detail: unknown): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail.slice(0, 200);
  if (typeof detail === "object" && detail !== null) {
    if ("errors" in detail && Array.isArray((detail as { errors?: unknown }).errors)) {
      const errors = (detail as { errors: Array<unknown> }).errors;
      const messages = errors
        .map((e) => (typeof e === "object" && e !== null ? (e as { message?: string; status?: number }).message || "" : ""))
        .filter(Boolean)
        .join(" — ");
      if (messages) return messages.slice(0, 200);
    }
    if ("message" in detail && typeof (detail as { message?: unknown }).message === "string") {
      return String((detail as { message: string }).message).slice(0, 200);
    }
    try {
      return JSON.stringify(detail).slice(0, 200);
    } catch {}
  }
  return "";
}

export async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function fetchWorker(
  path: string,
  options: RequestInit = {}
) {
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (typeof window !== "undefined") {
    try {
      const riotKey = localStorage.getItem("ethone:cred:riot:riotApiKey") || localStorage.getItem("ethone:cred:riot:apiKey");
      const henrikKey = localStorage.getItem("ethone:cred:riot:henrikApiKey") || localStorage.getItem("ethone:cred:valorant:apiKey");
      const trackerKey = localStorage.getItem("ethone:cred:tracker:apiKey") || localStorage.getItem("ethone:cred:tracker-gg:apiKey");
      if (riotKey && !headers.has("x-riot-api-key")) headers.set("x-riot-api-key", riotKey);
      if (henrikKey && !headers.has("x-henrik-api-key")) headers.set("x-henrik-api-key", henrikKey);
      if (trackerKey && !headers.has("x-tracker-api-key")) headers.set("x-tracker-api-key", trackerKey);
    } catch {}
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${WORKER_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    const msg = isAbort ? "Délai d'attente dépassé (timeout 15s)" : "Impossible de joindre le serveur ETHONE";
    throw new WorkerError(msg, isAbort ? 504 : 503, isAbort ? "TIMEOUT" : "NETWORK_ERROR", null, true);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: { error?: { code?: string; message?: string; detail?: unknown; retryable?: boolean } } | null = null;
    let message = `Worker ${res.status}`;
    let code: string | undefined;
    let detail: unknown;
    let retryable: boolean | undefined;
    try {
      parsed = JSON.parse(text);
    } catch {}
    if (parsed?.error) {
      message = parsed.error.message || `Worker ${res.status}: ${parsed.error.code || ""}`;
      code = parsed.error.code;
      detail = parsed.error.detail;
      retryable = parsed.error.retryable === true;
    } else if (text) {
      message = `Worker ${res.status}: ${text}`;
    }

    const detailText = extractWorkerErrorDetail(detail);
    if (detailText) {
      message = `${message} (${detailText})`;
    }

    throw new WorkerError(message, res.status, code, detail, retryable);
  }

  return res.json().catch(() => null);
}

export async function uploadPublic(
  path: string,
  file: File
) {
  const headers = new Headers();
  headers.set("x-ethone-file-name", file.name);
  headers.set("x-ethone-file-mime", file.type || "application/octet-stream");
  headers.set("x-ethone-file-size", String(file.size));

  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers,
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Worker ${res.status}: ${text}`);
  }

  return res.json().catch(() => null);
}

export async function uploadWorker(
  path: string,
  file: File,
  meta: { clientId: string; parentId?: string } = { clientId: "" }
) {
  const token = await getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("x-ethone-client-id", meta.clientId);
  headers.set("x-ethone-file-name", file.name);
  headers.set("x-ethone-file-mime", file.type || "application/octet-stream");
  headers.set("x-ethone-file-size", String(file.size));
  if (meta.parentId) headers.set("x-ethone-file-parent", meta.parentId);

  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers,
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Worker ${res.status}: ${text}`);
  }

  return res.json().catch(() => null);
}

export async function getPublicProfile(username: string) {
  return fetchWorker(`/api/supabase/public-profile?username=${encodeURIComponent(username)}`);
}
