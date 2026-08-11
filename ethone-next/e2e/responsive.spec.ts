import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/login/", "/settings/", "/notes/", "/tasks/", "/files/", "/share/", "/drop/", "/plugins/spotify/", "/system/"];

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "ultrawide-1920", width: 1920, height: 1080 },
  { name: "ultrawide-2560", width: 2560, height: 1440 },
];

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`${route} at ${vp.name} has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route, { waitUntil: "load" });

      const hasOverflow = await page.evaluate(() => {
        const html = document.documentElement;
        return html.scrollWidth > html.clientWidth + 1;
      });

      expect(hasOverflow, `horizontal overflow detected at ${vp.name}`).toBe(false);
    });
  }
}
