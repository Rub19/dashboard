"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

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
