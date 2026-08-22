"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Server-side Supabase client for Next.js App Router.
 * Reads the auth session from cookies so Route Handlers and Server Actions
 * can query Supabase with the authenticated user's RLS context.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server contexts (Server Components) can read cookies but cannot
          // set them. Mutations that need cookie updates should run in
          // Server Actions or Route Handlers.
        }
      },
    },
  });
}
