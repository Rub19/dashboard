import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

const SCREENSHOT_DIR = "e2e/screenshots/settings-journey";
mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: "serial" });

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: join(SCREENSHOT_DIR, name),
    fullPage: false,
  });
}

async function getRootDataset(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      theme: root.dataset.theme,
      accent: root.dataset.accent,
      density: root.dataset.density,
      dockMagnify: root.dataset.dockMagnify,
    };
  });
}

async function getStoredSettings(page: Page) {
  return page.evaluate(() => {
    const key =
      Object.keys(localStorage).find((k) => k.startsWith("ethone-settings-v1")) ??
      "ethone-settings-v1";
    const raw = localStorage.getItem(key);
    try {
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  });
}

for (const viewport of VIEWPORTS) {
  test(`ETHONE Control Center — settings journey (${viewport.name})`, async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    const { email, password } = requireAuthEnv();

    // 1. Open /login (screenshot avant connexion)
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input#auth-email", { timeout: 10000 });
    await screenshot(page, `${viewport.name}-01-login.png`);

    // 2. Sign in with password via auth-helpers (Supabase direct API)
    await signInByPassword(page, request, email, password);
    await page.waitForURL("/", { timeout: 15000 });
    await page.waitForSelector("#main-content", { timeout: 10000 });
    await page.waitForTimeout(800);
    await screenshot(page, `${viewport.name}-02-home.png`);

    // 4. Open /settings/appearance
    await page.goto("/settings/appearance");
    await page.waitForSelector('[data-section="appearance"]', { timeout: 10000 });
    await page.waitForTimeout(600);
    await screenshot(page, `${viewport.name}-03-settings-appearance.png`);

    // 5. Select premium theme (cyber-neon), forcing at least one update
    const premiumTheme = page.locator('[data-testid="premium-theme-cyber-neon"]');
    const obsidianTheme = page.locator('[data-testid="premium-theme-obsidian"]');
    await premiumTheme.scrollIntoViewIfNeeded();
    await premiumTheme.waitFor({ timeout: 10000 });
    await obsidianTheme.click();
    await page.waitForTimeout(400);
    await expect(obsidianTheme).toHaveAttribute("aria-pressed", "true");
    await premiumTheme.click();
    await page.waitForTimeout(600);
    await expect(premiumTheme).toHaveAttribute("aria-pressed", "true");
    await screenshot(page, `${viewport.name}-04-theme-cyber-neon.png`);

    // 6. Select accent color (mint), forcing at least one update
    const mintAccent = page.locator('[data-testid="accent-color-mint"]');
    const violetAccent = page.locator('[data-testid="accent-color-violet"]');
    await mintAccent.scrollIntoViewIfNeeded();
    await mintAccent.waitFor({ timeout: 10000 });
    await violetAccent.click();
    await page.waitForTimeout(400);
    await expect(violetAccent).toHaveAttribute("aria-pressed", "true");
    await mintAccent.click();
    await page.waitForTimeout(400);
    await expect(mintAccent).toHaveAttribute("aria-pressed", "true");
    await screenshot(page, `${viewport.name}-05-accent-mint.png`);

    // 7. Change density to compact, forcing at least one update
    const densitySection = page.locator("#section-density");
    await densitySection.scrollIntoViewIfNeeded();
    await densitySection.waitFor({ timeout: 10000 });
    const comfortableDensity = densitySection.locator(
      '[data-testid="button-grid-option-comfortable"]'
    );
    const compactDensity = densitySection.locator(
      '[data-testid="button-grid-option-compact"]'
    );
    await comfortableDensity.scrollIntoViewIfNeeded();
    await comfortableDensity.waitFor({ timeout: 10000 });
    await comfortableDensity.click();
    await page.waitForTimeout(400);
    await expect(comfortableDensity).toHaveAttribute("aria-pressed", "true");
    await compactDensity.click();
    await page.waitForTimeout(600);
    await expect(compactDensity).toHaveAttribute("aria-pressed", "true");
    await screenshot(page, `${viewport.name}-06-density-compact.png`);

    // 8. Change dock setting (disable dockMagnify), forcing at least one update
    const appearanceSection = page.locator("#section-appearance");
    await appearanceSection.scrollIntoViewIfNeeded();
    const dockMagnify = appearanceSection.locator(
      '[data-testid="dock-magnify"] button[role="switch"]'
    );
    await dockMagnify.scrollIntoViewIfNeeded();
    await dockMagnify.waitFor({ timeout: 10000 });
    const dockChecked = await dockMagnify.getAttribute("aria-checked");
    if (dockChecked === "false") {
      // already desired, toggle away and back to force a save
      await dockMagnify.click();
      await page.waitForTimeout(400);
      await expect(dockMagnify).toHaveAttribute("aria-checked", "true");
    }
    // ensure final state is false
    const dockCheckedAgain = await dockMagnify.getAttribute("aria-checked");
    if (dockCheckedAgain === "true") {
      await dockMagnify.click();
      await page.waitForTimeout(400);
    }
    await expect(dockMagnify).toHaveAttribute("aria-checked", "false");
    await screenshot(page, `${viewport.name}-07-dock-magnify.png`);

    // 9. Change notifications (enable trackerNotifications), forcing at least one update
    await page.goto("/settings/notifications");
    await page.waitForSelector('[data-section="notifications"]', { timeout: 10000 });
    await page.waitForTimeout(400);
    const notificationsSection = page.locator("#section-notifications");
    const trackerSwitch = notificationsSection.locator(
      '[data-testid="setting-field-trackerNotifications"] button[role="switch"]'
    );
    await trackerSwitch.scrollIntoViewIfNeeded();
    await trackerSwitch.waitFor({ timeout: 10000 });
    const trackerChecked = await trackerSwitch.getAttribute("aria-checked");
    if (trackerChecked === "true") {
      // already desired, toggle away and back to force a save
      await trackerSwitch.click();
      await page.waitForTimeout(400);
      await expect(trackerSwitch).toHaveAttribute("aria-checked", "false");
    }
    // ensure final state is true
    const trackerCheckedAgain = await trackerSwitch.getAttribute("aria-checked");
    if (trackerCheckedAgain === "false") {
      await trackerSwitch.click();
      await page.waitForTimeout(400);
    }
    await expect(trackerSwitch).toHaveAttribute("aria-checked", "true");
    await screenshot(page, `${viewport.name}-08-notifications-tracker.png`);

    // 10. Back to /home
    await page.goto("/");
    await page.waitForSelector("#main-content", { timeout: 10000 });
    await page.waitForTimeout(800);
    await screenshot(page, `${viewport.name}-09-home-after-settings.png`);

    // 11. Open /mail
    await page.goto("/mail");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1200);
    await expect(page).toHaveTitle(/ETHONE.*Mail/i, { timeout: 10000 });

    // 12. Open a mail thread if available, otherwise verify the mail title
    const mailThreadItem = page.locator('[data-testid="mail-thread-item"]').first();
    const hasThreads = await mailThreadItem
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (hasThreads) {
      await mailThreadItem.click();
      await page.waitForTimeout(600);
      await expect(
        page.locator('[data-testid="mail-detail-subject"]')
      ).toBeVisible({ timeout: 10000 });
    } else {
      await expect(
        page.locator("text=Boîte de réception").or(page.locator("text=Configurez votre profil mail"))
      ).toBeVisible({ timeout: 5000 });
    }
    await screenshot(page, `${viewport.name}-10-mail.png`);

    // 13. Refresh page
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#main-content", { timeout: 10000 });
    await page.waitForTimeout(800);
    await screenshot(page, `${viewport.name}-11-mail-refreshed.png`);

    // 14. Logout via profile dropdown
    const triggerTestId =
      viewport.name === "mobile" ? "user-profile-trigger-mobile" : "user-profile-trigger-desktop";
    const menuTestId = `${triggerTestId}-menu`;
    const profileTrigger = page.locator(`[data-testid="${triggerTestId}"]`);
    await profileTrigger.waitFor();
    await profileTrigger.click();
    await page
      .locator(`[data-testid="${menuTestId}"][data-open="true"] [data-testid="profile-logout-button"]`)
      .waitFor({ timeout: 10000 });
    await page
      .locator(`[data-testid="${menuTestId}"][data-open="true"] [data-testid="profile-logout-button"]`)
      .click();
    await page
      .locator(`[data-testid="${menuTestId}"][data-open="true"] [data-testid="profile-logout-confirm"]`)
      .waitFor({ timeout: 10000 });
    await page
      .locator(`[data-testid="${menuTestId}"][data-open="true"] [data-testid="profile-logout-confirm"]`)
      .click();
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await screenshot(page, `${viewport.name}-12-logout.png`);

    // 15. Reconnect
    await signInByPassword(page, request, email, password);
    await page.waitForURL("/", { timeout: 15000 });
    await page.waitForSelector("#main-content", { timeout: 10000 });
    await page.waitForTimeout(1200);
    await screenshot(page, `${viewport.name}-13-reconnect.png`);

    // 16. Verify settings persisted
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.theme === "cyber-neon" &&
        document.documentElement.dataset.density === "compact" &&
        document.documentElement.dataset.dockMagnify === "false",
      { timeout: 10000 }
    );
    const rootDataset = await getRootDataset(page);
    expect(rootDataset.theme).toBe("cyber-neon");
    expect(rootDataset.accent).toBe("mint");
    expect(rootDataset.density).toBe("compact");
    expect(rootDataset.dockMagnify).toBe("false");

    const stored = await getStoredSettings(page);
    expect(stored.trackerNotifications).toBe(true);

    await screenshot(page, `${viewport.name}-14-persisted.png`);
  });
}
