import { test, expect } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bvgifyzhpzkbrwdjrqsg.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

const TEST_EMAIL = process.env.TEST_EMAIL || process.env.ETHONE_AUDIT_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_PASSWORD || process.env.ETHONE_AUDIT_PASSWORD || "";

const COVER = "https://i.scdn.co/image/ab67616d0000b273664e38c99d077cc52ab48914";

function nowPlayingPayload() {
  return {
    data: {
      playing: true,
      track: {
        id: "spotify:test-track",
        title: "Test Track",
        artist: "Test Artist",
        album: "Test Album",
        artworkUrl: COVER,
        cover: COVER,
        progressMs: 30000,
        durationMs: 180000,
        volumePercent: 80,
        deviceId: "test-device",
        isPlaying: true,
        isSaved: false,
      },
    },
  };
}

async function authenticatePage(page: import("@playwright/test").Page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_EMAIL/TEST_PASSWORD not configured");
    return;
  }

  const response = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => "{}");
    throw new Error(`Supabase sign in failed: ${response.status()} ${body}`);
  }

  const session = await response.json();
  const expiresAt = session.expires_at ? Number(session.expires_at) * 1000 : Date.now() + 3600000;

  await page.context().addInitScript((args) => {
    const [token, refresh, expires, settings, island] = args;
    localStorage.setItem("ethone-remember-me", "true");
    localStorage.setItem("ethone-remember-token", token);
    localStorage.setItem("ethone-remember-refresh", refresh);
    localStorage.setItem("ethone-remember-expires", String(expires));
    localStorage.setItem("ethone-auth-type", "password");
    localStorage.setItem("ethone-settings-v1", JSON.stringify(settings));
    localStorage.setItem("ethone_show_dynamic_island", JSON.stringify(island));
  }, [
    session.access_token,
    session.refresh_token,
    expiresAt,
    { liveNowPlayingSource: "spotify", liveSpotifyClientId: "test-client-id", performanceMode: "normal" },
    { visible: true },
  ]);
}

async function mockSpotifyEndpoints(page: import("@playwright/test").Page) {
  await page.route(`${WORKER_URL}/api/spotify/now-playing**`, (route, request) => {
    if (request.method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(nowPlayingPayload()),
    });
  });

  await page.route(`${WORKER_URL}/api/spotify/control`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { ok: true } }),
    });
  });

  await page.route(`${WORKER_URL}/api/profiles**`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { list: [], active: null } }),
    });
  });
}

test.describe("Spotify player (Dynamic Island & Dock popover)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("album cover loads, progress and volume controls are interactive", async ({ page }) => {
    await authenticatePage(page);
    await mockSpotifyEndpoints(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const cover = page.locator('img[src*="i.scdn.co"]').first();
    await expect(cover).toBeVisible({ timeout: 15000 });

    const src = await cover.getAttribute("src");
    expect(src).toContain("i.scdn.co");

    const island = page.locator('div[role="status"]');
    await expect(island).toBeVisible();
    await island.click();
    await page.waitForTimeout(500);

    const spotifyPanel = page.getByTestId("dynamic-island-spotify");
    await expect(spotifyPanel.getByText("Test Track").first()).toBeVisible();

    const controlRequests: { action: string; body: unknown }[] = [];
    await page.route(`${WORKER_URL}/api/spotify/control`, async (route, request) => {
      if (request.method() === "POST") {
        const body = await request.postDataJSON();
        controlRequests.push({ action: body?.action, body });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ok: true } }),
      });
    });

    const progress = page.getByTestId("dynamic-island-progress");
    await expect(progress).toBeVisible();
    const box = await progress.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
      await page.waitForTimeout(400);
      expect(controlRequests.filter((r) => r.action === "seek").length).toBe(1);
    }

    const volume = page.getByTestId("dynamic-island-volume");
    await expect(volume).toBeVisible();
    const volBox = await volume.boundingBox();
    if (volBox) {
      await page.mouse.move(volBox.x + volBox.width * 0.2, volBox.y + volBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(volBox.x + volBox.width * 0.8, volBox.y + volBox.height / 2);
      await page.mouse.up();
      await page.waitForTimeout(400);
      expect(controlRequests.filter((r) => r.action === "volume").length).toBe(1);
    }

    const nextButton = spotifyPanel.getByRole("button", { name: /suivant|next/i }).first();
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await page.waitForTimeout(300);
    expect(controlRequests.filter((r) => r.action === "next").length).toBe(1);
  });
});
