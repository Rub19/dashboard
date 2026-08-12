import { test, expect } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

test("authenticated dashboard loads live cards without errors", async ({ page }) => {
  const errors: string[] = [];
  const networkErrors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("response", (res) => {
    if (res.status() >= 500) networkErrors.push(`${res.request().method()} ${res.url()} => ${res.status()}`);
  });

  await page.setViewportSize(MOBILE);

  await page.goto("/login/", { waitUntil: "load" });

  await page.getByRole("button", { name: /Mot de passe|Password|Contraseña/ }).first().click();
  await page.getByPlaceholder(/exemple|example|exemplo|exempel|Beispiel/).first().fill(String(process.env.TEST_EMAIL));
  await page.getByLabel(/Mot de passe|Password|Contraseña/).first().fill(String(process.env.TEST_PASSWORD));
  await page.getByRole("button", { name: /Se connecter|Sign in|Iniciar sesión|Anmelden/ }).first().click();

  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page).toHaveTitle(/Ethone|ETHONE/);

  const liveCards = page.locator('[data-testid="live-cards"]');
  await expect(liveCards).toBeVisible({ timeout: 10000 });

  expect(errors, "no uncaught exceptions").toEqual([]);
  expect(networkErrors, "no 5xx network errors").toEqual([]);
});
