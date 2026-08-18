import { test, expect } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bvgifyzhpzkbrwdjrqsg.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TEST_EMAIL = process.env.TEST_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "";

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
    const [token, refresh, expires] = args;
    localStorage.setItem("ethone-remember-me", "true");
    localStorage.setItem("ethone-remember-token", token);
    localStorage.setItem("ethone-remember-refresh", refresh);
    localStorage.setItem("ethone-remember-expires", String(expires));
    localStorage.setItem("ethone-auth-type", "password");
  }, [session.access_token, session.refresh_token, expiresAt]);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-v8-shell]", { timeout: 15000 });
  await page.waitForTimeout(200);
}

test.describe.serial("Command Palette UI", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("keyboard navigation, active indicator tracking, and no green outline", async ({ page }) => {
    await authenticatePage(page);

    // Open with Ctrl+K
    await page.keyboard.press("Control+k");

    const palette = page.locator('[role="dialog"][aria-label="Command palette"]').first();
    await expect(palette).toBeVisible();

    const input = palette.locator('input[role="combobox"]').first();
    await expect(input).toBeFocused();

    // No green focus outline / ring on the search input
    const inputStyle = await input.evaluate((el: HTMLElement) => {
      const s = window.getComputedStyle(el);
      return {
        outlineColor: s.outlineColor,
        outlineStyle: s.outlineStyle,
        boxShadow: s.boxShadow,
      };
    });
    expect(inputStyle.outlineStyle).toBe("none");
    expect(inputStyle.outlineColor).not.toContain("rgb(16, 185, 129");
    expect(inputStyle.outlineColor).not.toContain("rgb(123, 229, 195");
    const boxShadowColors = inputStyle.boxShadow.match(/rgb[a]?\([^)]+\)/g) || [];
    expect(boxShadowColors.some((c) => c.includes("16, 185, 129") || c.includes("123, 229, 195"))).toBe(false);

    const list = palette.locator('[role="listbox"]').first();
    await expect(list).toBeVisible();

    const getActive = () => list.locator('[role="option"][aria-selected="true"]').first();

    const first = getActive();
    await expect(first).toBeVisible();
    const firstText = await first.textContent();

    // Navigate down one and back up to the first item
    await page.keyboard.press("ArrowDown");
    const afterDown = getActive();
    await expect(afterDown).toBeVisible();
    const afterDownText = await afterDown.textContent();
    expect(afterDownText).not.toBe(firstText);

    await page.keyboard.press("ArrowUp");
    const afterUp = getActive();
    await expect(afterUp).toBeVisible();
    const afterUpText = await afterUp.textContent();
    expect(afterUpText).toBe(firstText);

    // Move down past the visible list and verify the active item is auto-scrolled into view
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("ArrowDown");
    }
    await page.waitForTimeout(400);
    const scrolledActive = getActive();
    await expect(scrolledActive).toBeVisible();

    const inView = await scrolledActive.evaluate((el: HTMLElement) => {
      const list = el.closest('[role="listbox"]') as HTMLElement | null;
      if (!list) return false;
      const elRect = el.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const pad = 8;
      return elRect.top >= listRect.top - pad && elRect.bottom <= listRect.bottom + pad;
    });
    expect(inView).toBe(true);

    // Filter to "Nouvelle note" and open it
    await input.fill("Nouvelle note");
    await page.waitForTimeout(200);

    const noteItem = list.getByRole("option", { name: /Nouvelle note/i }).first();
    await expect(noteItem).toBeVisible();

    await page.keyboard.press("Enter");

    await page.waitForURL("**/notes/**", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/notes\//);

    await expect(palette).toHaveCSS("opacity", "0");
    await expect(input).not.toBeFocused();
  });

  test("Tab and Escape navigation with active indicator tracking", async ({ page }) => {
    await authenticatePage(page);

    await page.keyboard.press("Control+k");
    const palette = page.locator('[role="dialog"][aria-label="Command palette"]').first();
    await expect(palette).toBeVisible();

    const input = palette.locator('input[role="combobox"]').first();
    await expect(input).toBeFocused();

    const list = palette.locator('[role="listbox"]').first();
    const getActive = () => list.locator('[role="option"][aria-selected="true"]').first();

    // Tab forward then shift+Tab back
    const first = getActive();
    await expect(first).toBeVisible();
    const firstText = await first.textContent();

    await page.keyboard.press("Tab");
    const afterTab = getActive();
    await expect(afterTab).toBeVisible();
    const afterTabText = await afterTab.textContent();
    expect(afterTabText).not.toBe(firstText);

    await page.keyboard.press("Shift+Tab");
    const afterShiftTab = getActive();
    await expect(afterShiftTab).toBeVisible();
    const afterShiftTabText = await afterShiftTab.textContent();
    expect(afterShiftTabText).toBe(firstText);

    // Escape closes the palette
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCSS("opacity", "0");
    await expect(input).not.toBeFocused();
  });

  test("pinned command is persisted across reload", async ({ page }) => {
    await authenticatePage(page);

    await page.keyboard.press("Control+k");
    const palette = page.locator('[role="dialog"][aria-label="Command palette"]').first();
    await expect(palette).toBeVisible();

    const input = palette.locator('input[role="combobox"]').first();
    await expect(input).toBeFocused();

    const list = palette.locator('[role="listbox"]').first();
    const first = list.locator('[role="option"]').first();
    await expect(first).toBeVisible();

    const pin = first.locator('button[type="button"]').first();
    await expect(pin).toBeVisible();
    await expect(pin).toHaveAttribute("title", "Épingler");
    await pin.click();

    // Close and reload
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCSS("opacity", "0");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-v8-shell]", { timeout: 15000 });

    await page.keyboard.press("Control+k");
    await expect(palette).toBeVisible();
    await expect(input).toBeFocused();

    const firstAfterReload = list.locator('[role="option"]').first();
    await expect(firstAfterReload).toBeVisible();

    const unpin = firstAfterReload.locator('button[type="button"]').first();
    await expect(unpin).toBeVisible();
    await expect(unpin).toHaveAttribute("title", "Désépingler");

    // Clean up: unpin the command
    await unpin.click();
    await page.keyboard.press("Escape");
  });
});
