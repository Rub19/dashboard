import type { Page, APIRequestContext } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getAuthKey() {
  try {
    const url = new URL(SUPABASE_URL);
    const ref = url.hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-auth-token";
  }
}

const AUTH_KEY = getAuthKey();

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
  const storage = JSON.stringify(session);

  await page.context().addInitScript((args) => {
    const [key, value] = args;
    localStorage.setItem(key, value);
  }, [AUTH_KEY, storage]);

  // Reload any already-open page so the localStorage token is picked up.
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
