import { test, expect } from "@playwright/test";

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
  "/profile/",
  "/security/",
  "/spaces/",
  "/team/",
  "/brain/",
  "/changelog/",
  "/share/",
  "/drop/",
];

for (const route of ROUTES) {
  test(`page ${route} loads and has title`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(route, { waitUntil: "load" });
    await expect(page).toHaveTitle(/Ethone|ETHONE/);
    expect(errors, `uncaught exceptions on ${route}`).toEqual([]);
  });
}
