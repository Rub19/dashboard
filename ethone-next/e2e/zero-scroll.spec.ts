import { test, expect } from "@playwright/test";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

test.setTimeout(120000);
test.describe.configure({ mode: "serial" });

const VIEWPORTS = [
  { name: "desktop-1080", width: 1920, height: 1080 },
  { name: "desktop-800", width: 1280, height: 800 },
  { name: "desktop-768", width: 1366, height: 768 },
];

test("home page stays locked to 100dvh and resists wheel / keyboard scroll", async ({ page, request }) => {
  const { email, password } = requireAuthEnv();
  await signInByPassword(page, request, email, password);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#main-content", { timeout: 10000 });
    await page.waitForTimeout(800);

    const scrollInfo = await page.evaluate(() => ({
      htmlScrollHeight: document.documentElement.scrollHeight,
      htmlClientHeight: document.documentElement.clientHeight,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
      mainScrollHeight: document.getElementById("main-content")?.scrollHeight,
      mainClientHeight: document.getElementById("main-content")?.clientHeight,
      hasHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      hasVertical: document.documentElement.scrollHeight > document.documentElement.clientHeight,
    }));

    expect(scrollInfo.hasVertical, `html should not overflow on ${vp.name}`).toBe(false);
    expect(scrollInfo.hasHorizontal, `html should not have horizontal scroll on ${vp.name}`).toBe(false);

    const topBefore = await page.evaluate(() => window.scrollY);
    const mainTopBefore = await page.evaluate(() => document.getElementById("main-content")?.scrollTop ?? 0);

    // Simulate 10 wheel "ticks"
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(20);
    }

    // Simulate Page Down / Arrow Down keys
    await page.keyboard.press("PageDown");
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowDown");

    const topAfter = await page.evaluate(() => window.scrollY);
    const mainTopAfter = await page.evaluate(() => document.getElementById("main-content")?.scrollTop ?? 0);

    expect(topAfter, `window scrollY should not change after wheel on ${vp.name}`).toBe(topBefore);
    expect(mainTopAfter, `main scrollTop should not change after wheel on ${vp.name}`).toBe(mainTopBefore);

    // Screenshot for visual reference
    await page.screenshot({ path: `e2e/screenshots/zero-scroll-${vp.name}.png`, fullPage: false });
  }
});
