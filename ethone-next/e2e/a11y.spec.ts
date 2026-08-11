import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  "/",
  "/login/",
  "/settings/",
  "/notes/",
  "/tasks/",
  "/calendar/",
  "/bills/",
  "/activity/",
  "/connections/",
  "/files/",
  "/flows/",
  "/focus/",
  "/interactions/",
  "/macros/",
  "/mail/",
  "/matches/",
  "/personas/",
  "/plugins/",
  "/plugins/spotify/",
  "/plugins/discord/",
  "/plugins/github/",
  "/plugins/todoist/",
  "/plugins/youtube/",
  "/plugins/reddit/",
  "/plugins/weather/",
  "/profile/",
  "/security/",
  "/spaces/",
  "/system/",
  "/team/",
  "/brain/",
  "/changelog/",
  "/share/",
  "/drop/",
];

for (const route of ROUTES) {
  test.describe(`a11y ${route}`, () => {
    ["Desktop Chrome", "Pixel 5", "iPad Mini"].forEach((deviceName) => {
      test(`${deviceName}: no critical a11y violations`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        const critical = results.violations.filter((v) => v.impact === "critical");
        expect(critical).toEqual([]);
      });
    });
  });
}
