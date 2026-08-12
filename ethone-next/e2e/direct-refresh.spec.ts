import { test, expect } from "@playwright/test";

const ROUTES = [
  { path: "/plugins/spotify/", label: "plugin spotify" },
  { path: "/drop/?slug=test-refresh", label: "drop with slug" },
  { path: "/share/?slug=test-refresh", label: "share with slug" },
];

for (const { path, label } of ROUTES) {
  test(`direct refresh on ${label} loads without uncaught exceptions`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(path, { waitUntil: "load" });
    await expect(page).toHaveTitle(/Ethone|ETHONE/);
    expect(errors, `uncaught exceptions on ${path}`).toEqual([]);
  });
}
