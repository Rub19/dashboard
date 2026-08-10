"use client";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ||
  "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const auth = JSON.parse(localStorage.getItem("ethone-auth") || "null");
    return auth?.access_token || null;
  } catch {
    return null;
  }
}

export async function fetchWorker(
  path: string,
  options: RequestInit = {}
) {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Worker ${res.status}: ${text}`);
  }

  return res.json().catch(() => null);
}
