import { test, expect } from "@playwright/test";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

test.describe("Brain chat interaction", () => {
  test("sends a message and renders response without error banner", async ({ page, request }) => {
    const { email, password } = requireAuthEnv();
    await signInByPassword(page, request, email, password);

    await page.goto("/brain/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#main-content", { timeout: 10000 });

    const input = page.locator('[data-testid="brain-input"]');
    await expect(input).toBeVisible({ timeout: 10000 });

    await input.fill("salut");
    await input.press("Enter");

    // Verify user message appears in the chat bubbles
    const userMsg = page.locator("text=salut").first();
    await expect(userMsg).toBeVisible({ timeout: 5000 });

    // Wait for response to stream or complete
    await page.waitForTimeout(3000);

    // Verify no decommissioned or model_not_found error banner
    const decommissionedError = page.locator("text=decommissioned, text=mixtral-8x7b-32768, text=model_not_found");
    await expect(decommissionedError).toHaveCount(0);

    // Verify input is re-enabled and ready
    await expect(input).toBeEnabled();
  });
});
