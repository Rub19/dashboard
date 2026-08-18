import { test, expect } from "@playwright/test";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

test.setTimeout(120000);
test.describe.configure({ mode: "serial" });

const SIDEBAR_ROUTES = [
  "/",
  "/notes/",
  "/tasks/",
  "/calendar/",
  "/files/",
  "/mail/",
  "/brain/",
  "/focus/",
  "/activity/",
  "/settings/",
  "/connections/",
  "/plugins/",
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

test("zero-scroll, floating glass sidebar and wallpaper visibility across sidebar routes", async ({ page, request }) => {
  const { email, password } = requireAuthEnv();
  await signInByPassword(page, request, email, password);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of SIDEBAR_ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#main-content", { timeout: 10000 });

      const scrollState = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        const main = document.getElementById("main-content");
        const bodyStyle = window.getComputedStyle(body);
        const mainStyle = main ? window.getComputedStyle(main) : null;
        const before = window.getComputedStyle(body, "::before");
        const after = window.getComputedStyle(body, "::after");
        const backgroundEffect = html.dataset.background;
        const wallpaper = html.dataset.wallpaper;
        const hasBackgroundEffect = !!backgroundEffect && backgroundEffect !== "solid";
        const hasWallpaperLayer = !!wallpaper && wallpaper !== "none" &&
          (before.backgroundImage !== "none" || after.backgroundImage !== "none");
        const wallpaperVisible =
          (hasBackgroundEffect && bodyStyle.backgroundImage !== "none") || hasWallpaperLayer;

        return {
          htmlNoScroll: html.scrollHeight <= html.clientHeight,
          bodyNoScroll: body.scrollHeight <= body.clientHeight,
          bodyOverflowHidden: ["hidden", "clip"].includes(bodyStyle.overflow) || ["hidden", "clip"].includes(bodyStyle.overflowY),
          mainOverflowHidden: mainStyle ? ["hidden", "clip"].includes(mainStyle.overflow) || ["hidden", "clip"].includes(mainStyle.overflowY) : false,
          mainBackground: mainStyle ? mainStyle.backgroundColor : "",
          wallpaperVisible,
        };
      });

      expect(scrollState.htmlNoScroll, `global vertical scroll on ${route} at ${vp.name}`).toBe(true);
      expect(scrollState.bodyNoScroll, `body vertical scroll on ${route} at ${vp.name}`).toBe(true);
      expect(scrollState.bodyOverflowHidden, `body overflow hidden on ${route} at ${vp.name}`).toBe(true);
      expect(scrollState.mainOverflowHidden, `main overflow hidden on ${route} at ${vp.name}`).toBe(true);
      expect(scrollState.wallpaperVisible, `wallpaper layer missing on ${route} at ${vp.name}`).toBe(true);
      const isTransparent = scrollState.mainBackground === "rgba(0, 0, 0, 0)" || scrollState.mainBackground === "transparent";
      expect(!isTransparent, `main panel missing background on ${route} at ${vp.name}`).toBe(true);

      if (vp.width >= 1024) {
        const sidebar = page.locator("aside, [data-sidebar]").first();
        await expect(sidebar, `sidebar missing on ${route} at ${vp.name}`).toBeVisible();
        const box = await sidebar.boundingBox();
        expect(box, `sidebar not rendered on ${route} at ${vp.name}`).not.toBeNull();
        expect(box!.x, `sidebar not floating on ${route} at ${vp.name}`).toBeGreaterThanOrEqual(6);
        expect(box!.y, `sidebar not floating on ${route} at ${vp.name}`).toBeGreaterThanOrEqual(6);
      }
    }
  }
});
