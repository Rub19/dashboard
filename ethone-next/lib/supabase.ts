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
