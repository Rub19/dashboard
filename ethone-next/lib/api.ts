"use client";

import { supabase } from "./supabase";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ||
  "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function fetchWorker(
  path: string,
  options: RequestInit = {}
) {
  const token = await getToken();
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
