import type { Page, APIRequestContext } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function signInByPassword(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string
) {
  const response = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    data: { email, password },
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => "{}");
    throw new Error(`Supabase sign in failed: ${response.status()} ${body}`);
  }

  const session = await response.json();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  const entries: [string, string][] = [
    ["ethone-remember-token", session.access_token],
    ["ethone-remember-refresh", session.refresh_token],
    ["ethone-remember-me", "true"],
    ["ethone-auth-type", "password"],
    ["ethone-remember-expires", String(expiresAt)],
  ];

  await page.context().addInitScript((args) => {
    const pairs = args as [string, string][];
    pairs.forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }, entries);

  // Reload any already-open page so the localStorage tokens are picked up.
  await page.goto("/");
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
}

export function requireAuthEnv() {
  const email = process.env.TEST_EMAIL || process.env.ETHONE_AUDIT_EMAIL;
  const password = process.env.TEST_PASSWORD || process.env.ETHONE_AUDIT_PASSWORD;
  if (!email || !password) {
    throw new Error("Missing TEST_EMAIL/TEST_PASSWORD (or ETHONE_AUDIT_EMAIL/ETHONE_AUDIT_PASSWORD) environment variables");
  }
  return { email, password };
}
