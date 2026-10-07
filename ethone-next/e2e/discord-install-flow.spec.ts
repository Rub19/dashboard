import { test, expect } from "@playwright/test";

test.describe("Discord Bot Install Flow", () => {
  test("shows installation screen for an uninstalled guild on /bot and allows skip", async ({ page }) => {
    const mockGuilds = [
      {
        id: "mock-uninstalled-1",
        name: "Serveur Test Sans Bot",
        iconUrl: "",
        owner: true,
        permissions: "8",
      },
    ];

    await page.addInitScript((guilds) => {
      localStorage.setItem("ethone:discord:guilds", JSON.stringify(guilds));
      localStorage.setItem("ethone:connected:discord", "true");
      localStorage.setItem("ethone:token:discord", "mock-token");
      localStorage.setItem("ethone:discord:bot_guild_ids", JSON.stringify([]));
    }, mockGuilds);

    await page.goto("/bot", { waitUntil: "domcontentloaded" });

    const serverCard = page.locator("text=Serveur Test Sans Bot").first();
    await expect(serverCard).toBeVisible();

    const installButton = page.locator("button:has-text('Installer')").first();
    await expect(installButton).toBeVisible();

    await installButton.click();

    await expect(page.locator("text=Installer Etho sur Serveur Test Sans Bot")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Ajoute Etho au serveur")).toBeVisible();
    await expect(page.locator("text=Place son rôle tout en haut")).toBeVisible();
    await expect(page.locator("text=Reviens ici")).toBeVisible();
    await expect(page.locator("button:has-text('Vérifier')")).toBeVisible();

    const skipButton = page.locator("button:has-text('Passer l\\'attente')");
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    await page.waitForURL((url) => url.pathname.includes("/discord") || url.pathname.includes("/login"), { timeout: 5000 });
    expect(page.url()).toContain("mock-uninstalled-1");
  });
});
