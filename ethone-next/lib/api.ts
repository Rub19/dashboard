"use client";

import { supabase } from "./supabase";

export const WORKER_URL =
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
