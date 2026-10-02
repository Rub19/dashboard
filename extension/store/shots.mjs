// Captures Chrome Web Store (1280x800 et tuile 440x280) à partir de la vraie popup, rendue par Playwright.
// Lancer : node extension/store/shots.mjs (Playwright est pris dans ethone-next).
// La popup tourne avec une API chrome minimale (onglet d'exemple) ; le statut lit le vrai ethone.dev/version.json.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ext = path.resolve(here, "..");
const { chromium } = createRequire(path.resolve(ext, "../ethone-next/package.json"))("@playwright/test");
const ORIGIN = "https://ext.local";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

const stub = ({ title, url, selection }) => `
  window.chrome = {
    tabs: { query: async () => [{ id: 1, index: 0, title: ${JSON.stringify(title)}, url: ${JSON.stringify(url)} }], create: async () => {} },
    scripting: { executeScript: async () => [{ result: ${JSON.stringify(selection)} }] },
  };`;

// Cadre « navigateur » : la popup ancrée sous l'icône d'extension, avec un titre à gauche.
const frame = ({ heading, sub, points, light }) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 800px; overflow: hidden; font-family: "Segoe UI", Inter, system-ui, sans-serif;
    background: ${light ? "radial-gradient(900px 500px at 85% 0%, #f9d9e2, transparent), #f5f6f9" : "radial-gradient(900px 520px at 85% 0%, #4a1022, transparent), #0b0c10"};
    color: ${light ? "#111827" : "#f3f4f6"}; }
  .copy { position: absolute; left: 88px; top: 190px; width: 520px; }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 22px; letter-spacing: .02em; }
  .brand img { width: 44px; height: 44px; border-radius: 12px; }
  h1 { margin-top: 34px; font-size: 52px; line-height: 1.04; letter-spacing: -0.025em; font-weight: 750; }
  p.sub { margin-top: 18px; font-size: 20px; line-height: 1.45; color: ${light ? "#5b6472" : "#9aa3b2"}; }
  ul { margin-top: 30px; padding: 0; list-style: none; display: grid; gap: 12px; font-size: 17px; }
  li { display: flex; gap: 12px; align-items: center; }
  li::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #c1234f; flex: none; }
  .bar { position: absolute; left: 700px; top: 40px; width: 540px; height: 44px; border-radius: 14px;
    background: ${light ? "#ffffffcc" : "#ffffff10"}; border: 1px solid ${light ? "#0000001a" : "#ffffff1a"}; }
  .bar .ico { position: absolute; right: 12px; top: 8px; width: 28px; height: 28px; border-radius: 8px; background: #c1234f33; display: grid; place-items: center; }
  .bar .ico img { width: 18px; height: 18px; }
  iframe { position: absolute; right: 40px; top: 100px; width: 340px; height: 640px; border: 0; border-radius: 16px; transform: scale(1.04); transform-origin: top right;
    box-shadow: 0 30px 80px -20px rgba(0,0,0,${light ? 0.25 : 0.7}), 0 0 0 1px ${light ? "#0000001a" : "#ffffff1a"}; background: transparent; }
</style></head><body>
  <div class="copy">
    <div class="brand"><img src="/icons/logo.png" alt="">ETHONE</div>
    <h1>${heading}</h1>
    <p class="sub">${sub}</p>
    <ul>${points.map((p) => `<li>${p}</li>`).join("")}</ul>
  </div>
  <div class="bar"><span class="ico"><img src="/icons/icon-32.png" alt=""></span></div>
  <iframe src="/popup.html"></iframe>
</body></html>`;

const tile = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 440px; height: 280px; overflow: hidden; font-family: "Segoe UI", Inter, system-ui, sans-serif; color: #f3f4f6;
    background: radial-gradient(420px 260px at 90% 0%, #6b1530, transparent), #0b0c10; display: grid; place-content: center; text-align: center; gap: 14px; }
  img { width: 72px; height: 72px; border-radius: 18px; margin: 0 auto; }
  h1 { font-size: 34px; letter-spacing: .02em; font-weight: 750; }
  p { font-size: 15px; color: #b6bdca; }
</style></head><body><img src="/icons/logo.png" alt=""><h1>ETHONE</h1><p>Une page, une idée, une tâche : en un clic.</p></body></html>`;

const pages = {
  "/shot-1.html": frame({
    heading: "Enregistre le web dans ETHONE.",
    sub: "Une page, un passage, une idée : tout part dans tes notes et tâches en un clic.",
    points: ["Page ou sélection → note ou tâche", "Note rapide sans quitter l'onglet", "Raccourcis clavier et clic droit"],
  }),
  "/shot-2.html": frame({
    heading: "Ton espace, à une touche.",
    sub: "Accès rapide à l'accueil, aux notes, aux tâches, au Brain, au calendrier et au bot Discord.",
    points: ["Touches 1 à 6 dans la popup", "« eth » dans la barre d'adresse", "Aucun mot de passe stocké"],
    light: true,
  }),
  "/tile.html": tile,
};

const browser = await chromium.launch();
async function shoot(name, { file, width, height, colorScheme = "dark", tab, typeNote }) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme, deviceScaleFactor: 1 });
  await ctx.addInitScript(stub(tab));
  await ctx.route(`${ORIGIN}/**`, (route) => {
    const p = new URL(route.request().url()).pathname;
    if (pages[p]) return route.fulfill({ contentType: "text/html", body: pages[p] });
    const f = path.join(ext, p);
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ contentType: TYPES[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}${file}`);
  const popup = page.frames().find((f) => f.url().endsWith("/popup.html"));
  if (popup) {
    await popup.waitForSelector('#status:not([data-state="loading"])', { timeout: 8000 }).catch(() => {});
    if (typeNote) {
      await popup.click('button[data-kind="task"]');
      await popup.fill("#noteText", typeNote);
      await popup.dispatchEvent("#noteText", "input");
    }
  }
  await page.waitForTimeout(1200); // fin des animations d'entrée
  await page.screenshot({ path: path.join(here, name) });
  await ctx.close();
  console.log("✓", name);
}

const example = {
  title: "backdrop-filter - CSS | MDN",
  url: "https://developer.mozilla.org/fr/docs/Web/CSS/backdrop-filter",
  selection: "La propriété backdrop-filter permet d'appliquer des effets graphiques, comme le flou, à la zone située derrière un élément.",
};
await shoot("screenshot-1.png", { file: "/shot-1.html", width: 1280, height: 800, tab: example });
await shoot("screenshot-2.png", { file: "/shot-2.html", width: 1280, height: 800, colorScheme: "light", tab: { ...example, selection: "" }, typeNote: "Relire la doc backdrop-filter" });
await shoot("promo-tile-440x280.png", { file: "/tile.html", width: 440, height: 280, tab: example });
await browser.close();
