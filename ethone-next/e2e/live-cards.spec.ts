import { test, expect } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

test("authenticated dashboard loads live cards without errors", async ({ page }) => {
  const errors: string[] = [];
  const networkErrors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[console.${msg.type()}]`, msg.text());
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 500) networkErrors.push(`${res.request().method()} ${res.url()} => ${res.status()}`);
  });

  await page.setViewportSize(MOBILE);

  await page.goto("/login/", { waitUntil: "domcontentloaded" });

  await page.getByPlaceholder(/exemple|example|exemplo|exempel|Beispiel/).first().fill(String(process.env.TEST_EMAIL));
  await page.getByLabel(/Mot de passe|Password|Contraseña/).first().fill(String(process.env.TEST_PASSWORD));
  await page.getByTestId("sign-in-button").click();

  await page.waitForURL("/", { waitUntil: "domcontentloaded", timeout: 15000 });

  await expect(page).toHaveTitle(/Ethone|ETHONE/);

  const liveCards = page.locator('[data-testid="live-cards"]');
  await expect(liveCards).toBeVisible({ timeout: 10000 });

  expect(errors, "no uncaught exceptions").toEqual([]);
  expect(networkErrors, "no 5xx network errors").toEqual([]);
});
