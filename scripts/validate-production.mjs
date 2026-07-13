import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const assert = (condition, message) => { if (!condition) failures.push(message); };

const required = [
  "index.html", "404.html", "CNAME", "manifest.webmanifest", "sw.js", "_headers",
  "icons/favicon.ico", "icons/ethone-mask-icon.svg", "icons/ethone-favicon-16.png", "icons/ethone-favicon-32.png",
  "icons/ethone-favicon-48.png", "icons/ethone-favicon-64.png", "icons/ethone-apple-touch-180.png",
  "icons/ethone-icon-192.png", "icons/ethone-icon-512.png", "icons/ethone-icon-maskable-512.png",
  "v8/main.mjs", "v8/services/auth-adapter.mjs", "v8/services/network-client.mjs",
  "v8/core/document-metadata.mjs",
  "v8/services/service-worker.mjs", "v8/services/external-diagnostics.mjs",
  "scripts/verify-deployment.mjs",
  "scripts/prepare-pages-artifact.mjs",
  "supabase/migrations/202607130001_private_user_data_rls.sql",
  ".github/workflows/deploy-pages.yml"
];
required.forEach((file) => assert(exists(file), `Missing required file: ${file}`));

const index = read("index.html");
const notFound = read("404.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const worker = read("sw.js");
const headers = read("_headers");
const workflow = read(".github/workflows/deploy-pages.yml");
const authConfig = read("v8/services/public-auth-config.mjs");
const i18nCatalog = read("v8/i18n/catalog.mjs");
const migration = read("supabase/migrations/202607130001_private_user_data_rls.sql");

assert(/data-ethone-entry="v8-only"/.test(index), "Production entry is not V8-only.");
assert(/<title>ETHONE<\/title>/.test(index) && !/<title>[^<]*(?:Dashboard|V8)/i.test(index), "Static browser title is stale.");
assert(/<title>ETHONE<\/title>/.test(notFound) && !/<title>[^<]*(?:Dashboard|V8)/i.test(notFound), "404 browser title is stale.");
assert(/property="og:title"/.test(index) && /name="twitter:card"/.test(index) && /rel="canonical"/.test(index), "Social or SEO metadata is incomplete.");
assert(/rel="mask-icon"[^>]*ethone-mask-icon\.svg/.test(index) && /rel="icon" type="image\/svg\+xml"/.test(index) && /sizes="16x16"/.test(index) && /sizes="32x32"/.test(index) && /sizes="48x48"/.test(index) && /sizes="64x64"/.test(index) && /apple-touch-icon" sizes="180x180"/.test(index), "Current ETHONE icons are not declared consistently.");
assert(manifest.name === "ETHONE" && manifest.short_name === "ETHONE", "PWA name is inconsistent with ETHONE.");
assert(manifest.theme_color === "#080a0d" && manifest.background_color === "#080a0d", "PWA colors are inconsistent with the application shell.");
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.src === "icons/ethone-icon.svg") && manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any") && manifest.icons.some((icon) => icon.src === "icons/ethone-icon-maskable-512.png" && icon.purpose === "maskable"), "PWA icon set is incomplete.");
assert(manifest.display === "standalone" && manifest.display_override?.includes("standalone") && manifest.prefer_related_applications === false, "PWA display policy is inconsistent.");
assert(Array.isArray(manifest.shortcuts) && ["#/home", "#/brain", "#/settings"].every((hash) => manifest.shortcuts.some((shortcut) => shortcut.url.endsWith(hash))), "PWA shortcuts are incomplete.");
assert(/type="module" src="\.\/v8\/main\.mjs"/.test(index), "Production module entry is missing.");
assert((index.match(/<script\b[^>]*type="module"/g) || []).length === 1, "Production entry must mount exactly one module runtime.");
assert(!exists("v8.html"), "Duplicate V8 HTML entry still exists.");
assert(!/(?:src|href)="[^"]*(?:legacy|pages\/dashboard|ui\/app-foundation)/.test(index), "Production entry references legacy assets.");
assert(!/\son(?:click|load|error|submit)=/i.test(index), "Production entry contains inline event handlers blocked by CSP.");
assert(/@supabase\/supabase-js@2\.110\.1/.test(index), "Supabase CDN dependency is not pinned.");
assert(/Content-Security-Policy/.test(index) && !/script-src[^;]*(?:\*|'unsafe-eval')/.test(index), "CSP is missing or script policy is too permissive.");
assert(/frame-ancestors 'none'/.test(headers), "Edge header policy does not prevent framing.");
assert(/Strict-Transport-Security/.test(headers), "HSTS policy is missing from edge configuration.");
assert(/isSensitiveRequest/.test(worker) && /access_token/.test(worker), "Service Worker does not bypass sensitive OAuth requests.");
assert(/empty-states-v16/.test(worker) && /precache\(\)\.then\(\(\) => self\.skipWaiting\(\)\)/.test(worker) && !/"\.\/v8\.html"/.test(worker), "Service Worker cache was not migrated to the Empty States release.");
assert(/request\.mode === "navigate"[\s\S]{0,180}navigationNetworkFirst\(request\)/.test(worker), "Navigation requests do not use the canonical shell cache key.");
assert(!/networkFirst\(request,\s*ETHONE_OFFLINE_URL\)/.test(worker), "Service Worker can cache arbitrary navigation URLs.");
assert(/contents:\s*read/.test(workflow) && /pages:\s*write/.test(workflow) && /id-token:\s*write/.test(workflow), "GitHub Pages permissions are incomplete.");
assert(/cancel-in-progress:\s*true/.test(workflow), "Concurrent GitHub Pages deployments are not cancelled.");
assert(/verify-deployment\.mjs/.test(workflow) && /https:\/\/ethone\.dev\//.test(workflow), "Post-deployment smoke tests are missing.");
assert(/prepare-pages-artifact\.mjs/.test(workflow) && /path:\s*dist/.test(workflow), "GitHub Pages does not use the V8-only artifact.");
assert(/enable row level security/i.test(migration) && /auth\.uid\(\)/.test(migration), "RLS migration is incomplete.");
assert(/revoke all on public\.dashboard_data from anon/i.test(migration), "Anonymous dashboard data access is not revoked.");
assert((i18nCatalog.match(/^\s*"Space":\s*\{/gm) || []).length === 1, "The i18n catalog contains duplicate Space keys.");
assert((i18nCatalog.match(/^\s*"Local":\s*\{/gm) || []).length === 1, "The i18n catalog contains duplicate Local keys.");
assert((i18nCatalog.match(/^\s*"Runtime unifié":\s*\{/gm) || []).length === 1, "The i18n catalog contains duplicate runtime keys.");

const jwt = authConfig.match(/supabaseAnonKey:\s*"([^"]+)"/)?.[1] || "";
try {
  const payload = JSON.parse(Buffer.from(jwt.split(".")[1] || "", "base64url").toString("utf8"));
  assert(payload.role === "anon", "Public Supabase key is not an anon key.");
} catch {
  failures.push("Public Supabase key is not a valid JWT.");
}

const sourceFiles = [];
function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:mjs|js|css)$/.test(entry.name)) sourceFiles.push(absolute);
  });
}
walk(path.join(root, "v8"));

const javaScriptFiles = sourceFiles.filter((file) => /\.m?js$/.test(file));
const importGraph = new Map();
for (const absolute of javaScriptFiles) {
  const source = fs.readFileSync(absolute, "utf8");
  const relative = path.relative(root, absolute).replaceAll("\\", "/");
  assert(!/\b(?:TODO|FIXME|HACK|WIP)\b|console\.(?:log|debug)\s*\(/.test(source), `Temporary source marker in ${relative}`);
  const dependencies = [];
  for (const match of source.matchAll(/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["'](\.[^"']+)["']/g)) {
    const resolved = path.resolve(path.dirname(absolute), match[1]);
    assert(fs.existsSync(resolved), `Broken import in ${relative}: ${match[1]}`);
    if (fs.existsSync(resolved)) dependencies.push(resolved);
  }
  for (const match of source.matchAll(/import\(\s*["'](\.[^"']+)["']\s*\)/g)) {
    const resolved = path.resolve(path.dirname(absolute), match[1]);
    assert(fs.existsSync(resolved), `Broken dynamic import in ${relative}: ${match[1]}`);
    if (fs.existsSync(resolved)) dependencies.push(resolved);
  }
  importGraph.set(absolute, dependencies);
}

const reachable = new Set();
function visit(modulePath) {
  if (reachable.has(modulePath)) return;
  reachable.add(modulePath);
  (importGraph.get(modulePath) || []).forEach(visit);
}
visit(path.join(root, "v8", "main.mjs"));
javaScriptFiles.forEach((file) => assert(reachable.has(file), `Unreachable V8 module: ${path.relative(root, file).replaceAll("\\", "/")}`));

const privateSecret = /(?:service_role|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
for (const absolute of sourceFiles) {
  assert(!privateSecret.test(fs.readFileSync(absolute, "utf8")), `Possible private secret in ${path.relative(root, absolute)}`);
}

const expectedPngSizes = Object.freeze({
  "icons/ethone-favicon-16.png": 16,
  "icons/ethone-favicon-32.png": 32,
  "icons/ethone-favicon-48.png": 48,
  "icons/ethone-favicon-64.png": 64,
  "icons/ethone-apple-touch-180.png": 180,
  "icons/ethone-icon-192.png": 192,
  "icons/ethone-icon-512.png": 512,
  "icons/ethone-icon-maskable-512.png": 512
});
Object.entries(expectedPngSizes).forEach(([relative, size]) => {
  const image = fs.readFileSync(path.join(root, relative));
  assert(image.subarray(1, 4).toString("ascii") === "PNG" && image.readUInt32BE(16) === size && image.readUInt32BE(20) === size, `Invalid icon dimensions: ${relative}`);
});

const assetBlock = worker.match(/const\s+ETHONE_V8_ASSETS\s*=\s*\[([\s\S]*?)\];/)?.[1] || "";
const assets = [...assetBlock.matchAll(/"\.\/([^"?]+)"/g)].map((match) => match[1]);
assets.forEach((asset) => assert(exists(asset), `Service Worker asset is missing: ${asset}`));
assert(new Set(assets).size === assets.length, "Service Worker precache contains duplicate assets.");

const jsBytes = sourceFiles.filter((file) => /\.mjs$/.test(file)).reduce((sum, file) => sum + fs.statSync(file).size, 0);
const cssBytes = sourceFiles.filter((file) => /\.css$/.test(file)).reduce((sum, file) => sum + fs.statSync(file).size, 0);
assert(jsBytes <= 450560, `V8 JavaScript budget exceeded: ${jsBytes} bytes.`);
assert(cssBytes <= 196608, `V8 CSS budget exceeded: ${cssBytes} bytes.`);

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Production validation: PASS (${assets.length} cached assets, ${jsBytes} JS bytes, ${cssBytes} CSS bytes)`);
}
