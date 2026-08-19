"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Client Supabase pour le navigateur.
 * Les tokens de session sont synchronisés avec des cookies accessibles au client
 * afin que getSession() puisse relire la session après un refresh.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
  },
  cookies: {
    getAll() {
      if (typeof document === "undefined") return [];
      return document.cookie.split("; ").map((cookie) => {
        const [name, ...rest] = cookie.split("=");
        return { name, value: rest.join("=") || "" };
      });
    },
    setAll(cookiesToSet) {
      if (typeof document === "undefined") return;
      cookiesToSet.forEach(({ name, value, options }) => {
        const secure = window.location.protocol === "https:";
        const opts = [
          `path=${options?.path ?? "/"}`,
          secure ? "secure" : "",
          "SameSite=Lax",
          options?.maxAge ? `max-age=${options.maxAge}` : "",
          options?.expires ? `expires=${options.expires.toUTCString()}` : "",
        ]
          .filter(Boolean)
          .join("; ");
        document.cookie = `${name}=${encodeURIComponent(value)}; ${opts}`;
      });
    },
  },
});

export function isMissingSchemaError(err: unknown): boolean {
  if (err == null) return false;
  const asString = String(err);
  if (asString.includes("PGRST204") || asString.includes("PGRST116") || asString.includes("42P01")) return true;
  if (asString.includes("schema cache") || asString.includes("Could not find")) return true;
  if (typeof err === "object" && "code" in err) {
    const code = String((err as { code?: unknown }).code);
    if (code === "PGRST204" || code === "42P01" || code === "PGRST116") return true;
    const msg = String((err as { message?: unknown }).message || "");
    if (msg.includes("schema cache") || msg.includes("Could not find")) return true;
  }
  return false;
}
