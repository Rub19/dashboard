import { test, expect } from "@playwright/test";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

test.setTimeout(120000);

test.describe.configure({ mode: "serial" });

const SCREENS = [
  { name: "home", path: "/" },
  { name: "brain", path: "/brain" },
  { name: "mail", path: "/mail" },
  { name: "files", path: "/files" },
  { name: "notes", path: "/notes" },
  { name: "tasks", path: "/tasks" },
  { name: "calendar", path: "/calendar" },
  { name: "settings", path: "/settings" },
];

const MOBILE = { viewport: { width: 390, height: 844 } };

test("authenticated audit captures desktop and mobile screenshots", async ({ page, request }) => {
  const { email, password } = requireAuthEnv();
  await signInByPassword(page, request, email, password);

  for (const { name, path } of SCREENS) {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/Ethone/i);
    await page.screenshot({ path: `e2e/screenshots/desktop-${name}.png`, fullPage: true });

    // Mobile
    await page.setViewportSize(MOBILE.viewport);
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: `e2e/screenshots/mobile-${name}.png`, fullPage: true });
  }
});
