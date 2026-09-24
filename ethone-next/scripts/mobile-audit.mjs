/**
 * Audit de l'affichage mobile : ouvre chaque page du build statique (dossier dist/) dans un navigateur émulant un téléphone
 * (393x851, écran tactile) et mesure ce qui déborde à droite de l'écran. La session est factice et tout appel réseau
 * externe reçoit une réponse vide : on juge la MISE EN PAGE (pages vides, sans données), pas le contenu.
 *
 * Usage (depuis ethone-next/, après `npm run build`) :
 *   node scripts/mobile-audit.mjs [--shots] [--width 393] [filtre-de-route]
 * Écrit audit/mobile-report.json (et audit/mobile/*.png avec --shots).
 */
import { chromium, devices } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const shots = args.includes("--shots");
const widthArg = args.indexOf("--width");
const width = widthArg >= 0 ? Number(args[widthArg + 1]) : 393;
const filter = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const PORT = 3055;
// Le build local est fait sans variables Supabase : l'URL est « placeholder.supabase.co », donc la clé de session aussi.
const SUPABASE_REF = "placeholder";

async function routes() {
  const out = [];
  async function walk(dir, rel) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith("__")) continue;
      if (entry.isDirectory()) await walk(join(dir, entry.name), `${rel}/${entry.name}`);
      else if (entry.name === "index.html") out.push(rel || "/");
    }
  }
  await walk("dist", "");
  return out
    .filter((r) => !/\/(demo|1|general)$/.test(r) && !/community-game-night|staff-decision|feedback-event|test-123|404/.test(r))
    .sort();
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const fakeJwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "00000000-0000-4000-8000-000000000001", email: "audit@example.com", role: "authenticated", exp: 4102444800, session_id: "audit" })}.sig`;
const session = {
  access_token: fakeJwt,
  refresh_token: "audit",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  user: { id: "00000000-0000-4000-8000-000000000001", email: "audit@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} },
};

const server = spawn("npx", ["serve", "dist", "-l", String(PORT), "--no-clipboard"], { shell: true, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 4000));

const browser = await chromium.launch();
const device = { ...devices["Pixel 5"], viewport: { width, height: 851 } };
const context = await browser.newContext(device);
await context.addInitScript(
  ([key, value]) => {
    try {
      const parsed = JSON.parse(value);
      localStorage.setItem(key, value);
      localStorage.setItem("ethone-remember-token", parsed.access_token);
      localStorage.setItem("ethone-remember-refresh", parsed.refresh_token);
      localStorage.setItem("ethone-remember-me", "true");
      localStorage.setItem("ethone-auth-type", "password");
      localStorage.setItem("ethone-remember-expires", String(Date.now() + 24 * 3600 * 1000));
    } catch {}
  },
  [`sb-${SUPABASE_REF}-auth-token`, JSON.stringify(session)]
);
await context.route("**/*", (route) => {
  const url = route.request().url();
  if (url.startsWith(`http://localhost:${PORT}`) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
  const type = route.request().resourceType();
  if (["image", "font", "media"].includes(type)) return route.abort();
  const json = (body) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  if (url.includes("/auth/v1/user")) return json(session.user);
  if (url.includes("/auth/v1/token")) return json(session);
  if (url.includes("/rest/v1/")) return json([]);
  return json({});
});

const list = (await routes()).filter((r) => !filter || r.includes(filter));
await mkdir("audit/mobile", { recursive: true });
const report = [];

// Une seule page reste ouverte : elle démarre sur « / » (le temps que la session factice soit acceptée), puis on navigue
// de l'intérieur vers chaque route (navigation client, comme un vrai utilisateur qui clique).
const page = await context.newPage();
let errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(6000);

const withTimeout = (promise, ms, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`délai dépassé (${label})`)), ms))]);

async function ensureApp() {
  const ready = await page.evaluate(() => Boolean(window.next && window.next.router)).catch(() => false);
  if (ready) return;
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(6000);
}

for (const route of list) {
  errors = [];
  console.log(`… ${route}`);
  try {
    await ensureApp();
    await withTimeout(
      page.evaluate((path) => {
        // @ts-ignore
        window.next.router.push(path);
      }, `${route}${route.endsWith("/") ? "" : "/"}`),
      8000,
      "navigation"
    );
    await page.waitForTimeout(2600);
    const result = await withTimeout(page.evaluate(() => {
      const vw = window.innerWidth;
      const doc = document.documentElement;
      const overflowX = Math.max(doc.scrollWidth, document.body.scrollWidth) - vw;
      // éléments visibles dont le bord droit dépasse l'écran, hors conteneurs qui défilent volontairement
      const offenders = [];
      const scrolls = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p !== doc && p !== document.body) return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.right <= vw + 1) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || cs.position === "fixed") continue;
        if (scrolls(el)) continue;
        offenders.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || "").toString().slice(0, 70), right: Math.round(r.right), w: Math.round(r.width), text: (el.textContent || "").trim().slice(0, 30) });
        if (offenders.length >= 4) break;
      }
      // texte illisible : plus petit que 10 px
      const tiny = [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 9.5).length;
      const bodyText = document.body.innerText.slice(0, 60).replace(/\s+/g, " ");
      return { overflowX, offenders, tiny, bodyText, title: document.title };
    }), 10000, "mesure");
    if (shots && (result.overflowX > 4 || result.offenders.length)) await page.screenshot({ path: `audit/mobile/${route.replace(/\//g, "_") || "root"}.png` });
    report.push({ route, landed: await page.evaluate(() => location.pathname), ...result, errors });
  } catch (e) {
    report.push({ route, failed: String(e.message).slice(0, 100) });
  }
}

await browser.close();
if (server.pid) spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
await writeFile("audit/mobile-report.json", JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.failed || r.overflowX > 4 || (r.offenders && r.offenders.length));
console.log(`${report.length} pages auditées à ${width}px — ${bad.length} avec un défaut`);
for (const r of bad) {
  if (r.failed) console.log(`  ✗ ${r.route} : ${r.failed}`);
  else console.log(`  ▸ ${r.route} : déborde de ${r.overflowX}px${r.offenders.length ? ` — ${r.offenders.map((o) => `${o.tag}.${o.cls.split(" ")[0]}(${o.right})`).join(", ")}` : ""}`);
}
