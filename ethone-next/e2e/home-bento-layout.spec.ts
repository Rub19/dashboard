import { test, expect } from "@playwright/test";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

const VIEWPORTS = [
  { name: "1440p", width: 2560, height: 1440 },
  { name: "1080p", width: 1920, height: 1080 },
  { name: "desktop-1600", width: 1600, height: 900 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-standard", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

test.describe("Home Dashboard Bento Grid Layout", () => {
  test.setTimeout(60000);
  test("no overlapping bounding boxes across all viewports", async ({ page, request }) => {
    const { email, password } = requireAuthEnv();
    await signInByPassword(page, request, email, password);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#main-content", { timeout: 10000 });
      await page.waitForTimeout(1500);

      const cards = await page.evaluate(() => {
        const grid = document.querySelector("[data-home-grid]");
        if (!grid) return [];
        return Array.from(grid.querySelectorAll("[data-home-widget]")).map((c, i) => {
          const rect = c.getBoundingClientRect();
          return {
            index: i,
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          };
        });
      });

      expect(cards.length, `grid cards found at ${vp.name}`).toBeGreaterThan(0);

      // Check every pair of cards for geometric intersection/overlap
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const a = cards[i];
          const b = cards[j];

          // Compute horizontal & vertical overlap amount
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

          // If both horizontal AND vertical overlaps are greater than 1px, cards are colliding!
          const isColliding = overlapX > 1 && overlapY > 1;

          expect(
            isColliding,
            `Card ${i} and Card ${j} collide at ${vp.name}: overlapX=${overlapX}px, overlapY=${overlapY}px`
          ).toBe(false);
        }
      }

      if (vp.name === "1080p" || vp.name === "1440p" || vp.name === "desktop-1366") {
        await page.screenshot({ path: `e2e/screenshots/home-bento-${vp.name}.png`, fullPage: false });
      }
    }
  });
});
