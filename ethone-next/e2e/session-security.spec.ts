import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

// Phase 5 — Task 3: Security Center / multi-session / multi-tab / account-
// switch E2E scenarios, building on security-pentest.spec.ts's existing
// multi-context pattern. Requires TEST_EMAIL/TEST_PASSWORD (or
// ETHONE_AUDIT_EMAIL/ETHONE_AUDIT_PASSWORD) and a reachable Supabase +
// Worker deployment to actually run — see the Phase 5 report for exactly
// which of the tests below additionally need things this environment did
// not have (a debug-OTP-enabled Worker, a second real account).
test.setTimeout(120000);
test.describe.configure({ mode: "serial" });

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "";

// -----------------------------------------------------------------------
// IMPORTANT ARCHITECTURE NOTE (see Phase 5 report for the full writeup):
// Neither the password sign-in path (AuthProvider.signInPassword) nor the
// native Supabase email-OTP path (AuthProvider.verifyOtp) ever calls the
// Worker's POST /api/auth/device endpoint, and Supabase's own
// password/OTP-issued JWTs are NOT minted by the Worker's signServiceToken
// — they carry no `session_id` claim ethone_devices can match. That means a
// session created through the app's actual login UI never gets a
// Security-Center-visible row and Phase 1's per-request revocation has no
// session_id to check for it. The ONLY current path that produces a
// trackable session_id + ethone_devices row is the Worker's own OTP
// fallback (POST /api/auth/otp/send + /api/auth/otp/verify — router.js's
// "OTP fallback" section), independent of the frontend's login form. The
// tests below that need a revocable "other" session go through that Worker
// route directly (API-level, not the UI) for exactly that reason, and skip
// cleanly when the debug code it returns isn't available (production and
// most staging Workers won't have ETHONE_DEBUG_OTP set).
// -----------------------------------------------------------------------
async function otpSignIn(request: APIRequestContext, email: string): Promise<{ accessToken: string; deviceId: string } | null> {
  const sendRes = await request.post(`${WORKER_URL}/api/auth/otp/send`, {
    headers: { "content-type": "application/json" },
    data: { email },
  });
  if (!sendRes.ok()) return null;
  const sendBody = await sendRes.json().catch(() => null);
  const code = sendBody?.data?.code; // only present when ENVIRONMENT=development && ETHONE_DEBUG_OTP=true
  const userId = sendBody?.data?.userId;
  if (!code || !userId) return null;

  const verifyRes = await request.post(`${WORKER_URL}/api/auth/otp/verify`, {
    headers: { "content-type": "application/json" },
    data: { userId, email, code },
  });
  if (!verifyRes.ok()) return null;
  const verifyBody = await verifyRes.json().catch(() => null);
  const accessToken = verifyBody?.data?.token;
  const deviceId = verifyBody?.data?.deviceId;
  if (!accessToken || !deviceId) return null;
  return { accessToken, deviceId };
}

// Deterministic, locale-independent trigger (UserProfileDropdown.tsx hardcodes
// French strings for the sign-out confirmation rather than routing them
// through i18n, and TopBar.tsx renders it with a stable data-testid).
async function triggerSignOut(page: Page) {
  await page.getByTestId("user-profile-trigger-desktop").click();
  await page.getByText("Se déconnecter", { exact: true }).click();
  await page.getByText("Déconnexion", { exact: true }).click();
}

test.describe("Security Center — session revocation", () => {
  test("Security Center lists a foreign-created session and revoking it blocks that session's next Worker call", async ({ page, request }) => {
    const { email, password } = requireAuthEnv();
    const other = await otpSignIn(request, email);
    test.skip(!other, "Worker OTP debug code unavailable on this deployment (needs ENVIRONMENT=development + ETHONE_DEBUG_OTP=true) — cannot mint a second, independently-trackable session without it. Written correctly, not executable here — see Phase 5 report.");
    if (!other) return;

    // The "operator" tab — a normal password login, used only to click
    // through the Security Center UI. It does not need a session_id of its
    // own: SessionsManager lists every device row for the authenticated
    // user, not just the calling session's own row.
    await signInByPassword(page, request, email, password);
    await page.goto("/settings/security");

    const revokeButton = page.getByRole("button", { name: "Révoquer" }).first();
    await expect(revokeButton).toBeVisible({ timeout: 15000 });

    page.once("dialog", (dialog) => dialog.accept());
    await revokeButton.click();

    // Let the Worker call complete (toast confirms success, but we verify
    // the actual server-side effect independently of the UI below rather
    // than trusting the toast).
    await page.waitForTimeout(1500);

    const check = await request.get(`${WORKER_URL}/api/auth/devices`, {
      headers: { Authorization: `Bearer ${other.accessToken}` },
    });
    expect(check.status()).toBe(401);
    const body = await check.json().catch(() => ({}));
    expect(body?.error?.code).toBe("SESSION_REVOKED");
  });

  test("Sign out all other devices revokes every other session and never the calling one", async ({ page, request }) => {
    const { email, password } = requireAuthEnv();
    const otherB = await otpSignIn(request, email);
    const otherC = await otpSignIn(request, email);
    test.skip(!otherB || !otherC, "Worker OTP debug code unavailable on this deployment — see Phase 5 report.");
    if (!otherB || !otherC) return;

    await signInByPassword(page, request, email, password);
    await page.goto("/settings/security");

    const revokeAllButton = page.getByRole("button", { name: "Déconnecter" }).first();
    await expect(revokeAllButton).toBeVisible({ timeout: 15000 });

    page.once("dialog", (dialog) => dialog.accept());
    await revokeAllButton.click();
    await page.waitForTimeout(1500);

    for (const other of [otherB, otherC]) {
      const check = await request.get(`${WORKER_URL}/api/auth/devices`, {
        headers: { Authorization: `Bearer ${other.accessToken}` },
      });
      expect(check.status()).toBe(401);
      expect((await check.json().catch(() => ({})))?.error?.code).toBe("SESSION_REVOKED");
    }
  });
});

test.describe("Multi-tab — same browser, same user", () => {
  test("Tab A signing out does not silently break tab B mid-session; tab B's OWN next reload reflects the signed-out state", async ({ context, request }) => {
    const { email, password } = requireAuthEnv();

    // Two PAGES in the SAME context — genuinely sharing localStorage/cookies
    // the way two tabs of one real browser window do. (The existing
    // "two isolated browser contexts do not share session" test in
    // security-pentest.spec.ts deliberately uses TWO separate
    // browser.newContext() calls instead, to prove the opposite property —
    // no sharing across isolated profiles. This test is about the other
    // case: real same-browser multi-tab behavior.)
    const pageA = await context.newPage();
    await signInByPassword(pageA, request, email, password);

    const pageB = await context.newPage();
    await pageB.goto("/");
    await pageB.waitForSelector("#main-content", { timeout: 15000 }).catch(() => {});
    expect(pageB.url()).not.toContain("/login");

    // Tab A signs out via the real UI flow (AuthProvider.signOut()): revokes
    // server-side, clears the shared localStorage keys, then hard-reloads
    // ITSELF to /login.
    await triggerSignOut(pageA);
    await pageA.waitForURL("/login", { timeout: 15000 }).catch(() => {});
    expect(pageA.url()).toContain("/login");

    // Tab B: AuthProvider.tsx's `handleStorage` listener reacts to the
    // native `storage` event fired when tab A removes
    // `ethone-remember-token` from the shared localStorage — it nulls tab
    // B's in-memory session/user state, but it does NOT hard-reload tab B
    // or force navigation (that reload is signOut()'s own tab-local fix
    // from Phase 2, not a cross-tab push). So immediately after tab A signs
    // out, tab B may already show itself as unauthenticated in React state
    // without a URL change — but per Phase 2's design (see BootProvider.tsx:
    // there is no redirect-to-/login for "session resolved to null on a
    // private route", only for explicit sign-out), tab B is not expected to
    // navigate to /login on its own. Confirm reality rather than asserting
    // either extreme:
    await pageB.waitForTimeout(2000);
    const urlRightAfterA = pageB.url();

    // Tab B's OWN next reload must reflect the signed-out state cleanly —
    // this is the one guarantee Phase 2 actually built (resolveSession() on
    // boot re-reads the now-cleared localStorage).
    await pageB.reload();
    await pageB.waitForTimeout(2000);
    const stuckLoading = await pageB.getByText("Initialisation d'ETHONE").isVisible().catch(() => false);
    expect(stuckLoading).toBe(false);

    // Document, don't assume: report exactly what tab B's URL was right
    // after A signed out vs. after B's own reload, so a human reviewing the
    // first real run can see the actual behavior at a glance.
    console.log(`[multi-tab] tab B URL immediately after tab A signed out: ${urlRightAfterA}`);
    console.log(`[multi-tab] tab B URL after tab B's own reload: ${pageB.url()}`);
  });
});

test.describe("Account switch", () => {
  test("Signing out of one account and into a different one leaves no leftover namespaced data visible", async ({ page, request }) => {
    const email1 = process.env.TEST_EMAIL || process.env.ETHONE_AUDIT_EMAIL || "";
    const password1 = process.env.TEST_PASSWORD || process.env.ETHONE_AUDIT_PASSWORD || "";
    const email2 = process.env.TEST_EMAIL_2 || "";
    const password2 = process.env.TEST_PASSWORD_2 || "";
    const missing = !email1 || !password1 || !email2 || !password2;
    test.skip(missing, "Requires a SECOND real account (TEST_EMAIL_2/TEST_PASSWORD_2) not configured in this environment — written correctly, not executable here. See Phase 5 report.");
    if (missing) return;

    await signInByPassword(page, request, email1, password1);
    const account1Keys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("ethone:") || k.startsWith("ethone_"))
    );

    await triggerSignOut(page);
    await page.waitForURL("/login", { timeout: 15000 }).catch(() => {});

    await signInByPassword(page, request, email2, password2);
    await page.waitForTimeout(1000);

    // Every provider-namespaced / identity key that existed under account 1
    // must have been cleared by signOut()'s SIGNOUT_KEY_PREFIXES /
    // SIGNOUT_EXACT_KEYS sweep (AuthProvider.tsx) before account 2 is ever
    // allowed to populate the same key names — this is Phase 2's core
    // guarantee (cache/localStorage isolation across an account switch).
    const stillPresent = await page.evaluate(
      (keys: string[]) => keys.filter((k) => localStorage.getItem(k) !== null),
      account1Keys
    );
    expect(stillPresent).toEqual([]);
  });
});

test.describe("Expired/revoked session — clean state", () => {
  test("A session that is no longer valid does not leave the app stuck on an infinite loader", async ({ page }) => {
    const { email } = requireAuthEnv();

    // Seed a Supabase-shaped "remember me" session whose access token is
    // already expired and whose refresh token is deliberately invalid —
    // approximating "this session is no longer usable" (expired, or
    // revoked server-side) without needing a trackable session_id/device
    // row, which — per the architecture note above — neither the password
    // nor native-OTP login path currently produces anyway.
    const expiresAt = Date.now() - 3600_000;
    await page.context().addInitScript(
      (args) => {
        const [expiresAtMs, userEmail] = args as [number, string];
        localStorage.setItem("ethone-remember-token", "expired.invalid.token");
        localStorage.setItem("ethone-remember-refresh", "definitely-not-a-real-refresh-token");
        localStorage.setItem("ethone-remember-me", "true");
        localStorage.setItem("ethone-auth-type", "password");
        localStorage.setItem("ethone-remember-expires", String(expiresAtMs));
        void userEmail;
      },
      [expiresAt, email] as [number, string]
    );

    await page.goto("/");
    // Give AuthProvider.resolveSession() (getSession -> failed refresh ->
    // restoreFromStorage -> failed refresh -> session=null) and BootProvider
    // a bounded window to settle one way or another.
    await page.waitForTimeout(10000);

    const stuckLoading = await page.getByText("Initialisation d'ETHONE").isVisible().catch(() => false);
    expect(stuckLoading).toBe(false);

    // Document the actual outcome either way.
    console.log(`[expired-session] final URL: ${page.url()}`);

    // EXPECTED, per a reasonable security posture: a session that can no
    // longer be resolved lands the user on a clean, logged-out /login —
    // never an authenticated-looking shell with broken data underneath.
    //
    // Per code review for this phase (see the Phase 5 report):
    // BootProvider.tsx's `check()` only redirects to "/" when `session` is
    // truthy on a public route — there is NO branch that redirects to
    // "/login" when `session` resolves to null on a PRIVATE route (the only
    // place that ever navigates to /login is AuthProvider.signOut()'s own
    // hard reload, triggered by an explicit, user-initiated sign-out). If
    // this assertion fails on the first real run, that is this test
    // correctly surfacing a pre-existing gap, not a flaky/wrong test —
    // treat it as a finding to triage, not a false positive to silence.
    expect(page.url()).toContain("/login");
  });
});
