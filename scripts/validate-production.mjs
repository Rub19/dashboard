import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

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
  "v8/services/external-services-client.mjs", "v8/services/external-services-config.mjs",
  "v8/services/clock-manager.mjs", "v8/services/supabase-state-sync.mjs",
  "v8/core/document-metadata.mjs",
  "v8/ui/empty-state.mjs", "v8/ui/form-system.mjs",
  "v8/services/service-worker.mjs", "v8/services/external-diagnostics.mjs",
  "v8/services/auth-storage.mjs",
  "scripts/audit-security.mjs",
  "scripts/verify-supabase-security.mjs",
  "scripts/verify-security-headers.mjs",
  "SECURITY.md", ".gitignore",
  "WORKER_SECRETS_SETUP.md", "worker/README.md", "worker/package.json", "worker/pnpm-lock.yaml", "worker/wrangler.jsonc",
  "worker/src/index.js", "worker/src/router.js", "worker/src/middleware/auth.js", "worker/src/middleware/cors.js",
  "scripts/verify-deployment.mjs",
  "scripts/prepare-pages-artifact.mjs",
  "supabase/migrations/202607130001_private_user_data_rls.sql",
  "supabase/migrations/202607130002_fail_closed_public_schema.sql",
  "supabase/migrations/202607140001_supabase_first_user_state.sql",
  "supabase/migrations/202607140002_public_profile_directory.sql",
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
const cloudStateMigration = read("supabase/migrations/202607140001_supabase_first_user_state.sql");
const publicProfileMigration = read("supabase/migrations/202607140002_public_profile_directory.sql");
const supabaseVerifier = read("scripts/verify-supabase-security.mjs");
const externalServicesConfig = read("v8/services/external-services-config.mjs");
const externalServicesClient = read("v8/services/external-services-client.mjs");
const workerRouter = read("worker/src/router.js");
const workerCors = read("worker/src/middleware/cors.js");
const workerPackage = JSON.parse(read("worker/package.json"));
const workerLock = read("worker/pnpm-lock.yaml");
const serviceWorkerRelease = worker.match(/const ETHONE_VERSION = "([^"]+)"/)?.[1] || "";
const serviceWorkerReleaseToken = serviceWorkerRelease.match(/experience-v\d+$/)?.[0] || "";

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
assert(/<script src="\.\/v8\/core\/density-boot\.js"><\/script>/.test(index), "Density bootstrap is missing before first paint.");
assert((index.match(/<script\b[^>]*type="module"/g) || []).length === 1, "Production entry must mount exactly one module runtime.");
assert(!exists("v8.html"), "Duplicate V8 HTML entry still exists.");
assert(!/(?:src|href)="[^"]*(?:legacy|pages\/dashboard|ui\/app-foundation)/.test(index), "Production entry references legacy assets.");
assert(!/\son(?:click|load|error|submit)=/i.test(index), "Production entry contains inline event handlers blocked by CSP.");
assert(/@supabase\/supabase-js@2\.110\.1/.test(index), "Supabase CDN dependency is not pinned.");
assert(/Content-Security-Policy/.test(index) && !/script-src[^;]*(?:\*|'unsafe-eval')/.test(index), "CSP is missing or script policy is too permissive.");
assert(/https:\/\/raspy-fog-bf5b\.rub19-mailpro\.workers\.dev/.test(index) && /https:\/\/raspy-fog-bf5b\.rub19-mailpro\.workers\.dev/.test(headers), "Worker origin is missing from an exact production CSP.");
assert(/frame-ancestors 'none'/.test(headers), "Edge header policy does not prevent framing.");
assert(/Strict-Transport-Security/.test(headers), "HSTS policy is missing from edge configuration.");
assert(/isSensitiveRequest/.test(worker) && /access_token/.test(worker), "Service Worker does not bypass sensitive OAuth requests.");
assert(/^\d{4}-\d{2}-\d{2}-experience-v\d+$/.test(serviceWorkerRelease) && serviceWorkerReleaseToken && index.includes(serviceWorkerReleaseToken) && notFound.includes(serviceWorkerReleaseToken) && /event\.waitUntil\(precache\(\)\)/.test(worker) && !/precache\(\)\.then\(\(\) => self\.skipWaiting\(\)\)/.test(worker) && !/"\.\/v8\.html"/.test(worker), "Service Worker cache was not migrated to the current release.");
assert(/request\.mode === "navigate"[\s\S]{0,180}navigationNetworkFirst\(request\)/.test(worker), "Navigation requests do not use the canonical shell cache key.");
assert(!/networkFirst\(request,\s*ETHONE_OFFLINE_URL\)/.test(worker), "Service Worker can cache arbitrary navigation URLs.");
assert(/contents:\s*read/.test(workflow) && /pages:\s*write/.test(workflow) && /id-token:\s*write/.test(workflow), "GitHub Pages permissions are incomplete.");
assert(/cancel-in-progress:\s*true/.test(workflow), "Concurrent GitHub Pages deployments are not cancelled.");
assert(/verify-deployment\.mjs/.test(workflow) && /https:\/\/ethone\.dev\//.test(workflow), "Post-deployment smoke tests are missing.");
assert(/prepare-pages-artifact\.mjs/.test(workflow) && /path:\s*dist/.test(workflow), "GitHub Pages does not use the V8-only artifact.");
assert(/enable row level security/i.test(migration) && /auth\.uid\(\)/.test(migration), "RLS migration is incomplete.");
assert(/revoke all on public\.dashboard_data from anon/i.test(migration), "Anonymous dashboard data access is not revoked.");
assert(/create table if not exists public\.ethone_user_state/i.test(cloudStateMigration) && /force row level security/i.test(cloudStateMigration), "Supabase-first state table is missing forced RLS.");
assert(/auth\.uid\(\)[^;]{0,40}=\s*user_id/i.test(cloudStateMigration) && /with check/i.test(cloudStateMigration), "Supabase-first state policies are not owner-scoped.");
assert(/revoke all on(?: table)? public\.ethone_user_state from anon/i.test(cloudStateMigration), "Anonymous cloud-state access is not revoked.");
assert(/create table if not exists public\.ethone_public_profiles/i.test(publicProfileMigration) && /force row level security/i.test(publicProfileMigration), "Public profile directory is missing forced RLS.");
assert(/find_ethone_public_profile/i.test(publicProfileMigration) && /security definer/i.test(publicProfileMigration) && /grant execute[^;]+service_role/i.test(publicProfileMigration), "Public profile lookup is not restricted to the server RPC.");
assert(!/\bemail\b/i.test(publicProfileMigration), "Public profile lookup must not expose an e-mail field.");
assert(/WORKER_API_BASE_URL/.test(externalServicesConfig) && /rub19-mailpro\.workers\.dev/.test(externalServicesConfig), "Worker API URL is not centralized.");
assert(/const OPERATIONS = Object\.freeze/.test(externalServicesClient) && !/fetch\s*\(/.test(externalServicesClient), "ExternalServicesClient must use the central network layer and an operation allowlist.");
assert(!/\/api\/(?:proxy|fetch|url)/i.test(workerRouter) && !/Access-Control-Allow-Origin[^\n]*\*/i.test(workerCors), "Worker exposes a proxy route or wildcard CORS.");
assert(workerPackage.engines?.node === ">=22" && workerPackage.packageManager === "pnpm@11.7.0", "Worker runtime or package manager is not pinned.");
assert(workerPackage.devDependencies?.wrangler === "4.110.0" && /wrangler:\s*\n\s+specifier: 4\.110\.0\s*\n\s+version: 4\.110\.0/.test(workerLock), "Wrangler dependency and lockfile are not pinned together.");
assert(/REQUIRED_TABLES[^;]*ethone_user_state/.test(supabaseVerifier) && /ethone_user_state:user_id/.test(supabaseVerifier), "Supabase production preflight does not cover cloud state.");
assert(/REQUIRED_TABLES[^;]*ethone_public_profiles/.test(supabaseVerifier) && /ethone_public_profiles:user_id/.test(supabaseVerifier), "Supabase production preflight does not cover the public profile directory.");
assert(/rpc\/find_ethone_public_profile/.test(supabaseVerifier), "Supabase production preflight does not verify that the server-only RPC is denied to browsers.");
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
const staticImportGraph = new Map();
for (const absolute of javaScriptFiles) {
  const source = fs.readFileSync(absolute, "utf8");
  const relative = path.relative(root, absolute).replaceAll("\\", "/");
  assert(!/\b(?:TODO|FIXME|HACK|WIP)\b|console\.(?:log|debug)\s*\(/.test(source), `Temporary source marker in ${relative}`);
  const dependencies = [];
  const staticDependencies = [];
  for (const match of source.matchAll(/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["'](\.[^"']+)["']/g)) {
    const resolved = path.resolve(path.dirname(absolute), match[1]);
    assert(fs.existsSync(resolved), `Broken import in ${relative}: ${match[1]}`);
    if (fs.existsSync(resolved)) {
      dependencies.push(resolved);
      staticDependencies.push(resolved);
    }
  }
  for (const match of source.matchAll(/import\(\s*["'](\.[^"']+)["']\s*\)/g)) {
    const resolved = path.resolve(path.dirname(absolute), match[1]);
    assert(fs.existsSync(resolved), `Broken dynamic import in ${relative}: ${match[1]}`);
    if (fs.existsSync(resolved)) dependencies.push(resolved);
  }
  importGraph.set(absolute, dependencies);
  staticImportGraph.set(absolute, staticDependencies);
}

const reachable = new Set();
function visit(modulePath) {
  if (reachable.has(modulePath)) return;
  reachable.add(modulePath);
  (importGraph.get(modulePath) || []).forEach(visit);
}
visit(path.join(root, "v8", "main.mjs"));
visit(path.join(root, "v8", "core", "density-boot.js"));
javaScriptFiles.forEach((file) => assert(reachable.has(file), `Unreachable V8 module: ${path.relative(root, file).replaceAll("\\", "/")}`));

const eagerReachable = new Set();
function visitEager(modulePath) {
  if (eagerReachable.has(modulePath)) return;
  eagerReachable.add(modulePath);
  (staticImportGraph.get(modulePath) || []).forEach(visitEager);
}
visitEager(path.join(root, "v8", "main.mjs"));
visitEager(path.join(root, "v8", "core", "density-boot.js"));

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

const jsFiles = sourceFiles.filter((file) => /\.mjs$/.test(file));
const jsBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const jsGzipBytes = jsFiles.reduce((sum, file) => sum + gzipSync(fs.readFileSync(file)).byteLength, 0);
const cssFiles = sourceFiles.filter((file) => /\.css$/.test(file));
const cssBytes = cssFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const cssGzipBytes = cssFiles.reduce((sum, file) => sum + gzipSync(fs.readFileSync(file)).byteLength, 0);
const eagerJsBytes = [...eagerReachable].reduce((sum, file) => sum + fs.statSync(file).size, 0);
const eagerJsGzipBytes = [...eagerReachable].reduce((sum, file) => sum + gzipSync(fs.readFileSync(file)).byteLength, 0);
const brainSurfaceFiles = sourceFiles.filter((file) => file.includes(`${path.sep}brain${path.sep}`) || file.endsWith(`${path.sep}pages${path.sep}brain.mjs`));
const brainSurfaceBytes = brainSurfaceFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const brainSurfaceGzipBytes = brainSurfaceFiles.reduce((sum, file) => sum + gzipSync(fs.readFileSync(file)).byteLength, 0);
// Keep roughly five percent of headroom so a small feature cannot silently become a large payload regression.
const budgets = Object.freeze({ totalJavaScript: 1850000, totalJavaScriptGzip: 490000, eagerJavaScript: 920000, eagerJavaScriptGzip: 250000, brainSurface: 85500, brainSurfaceGzip: 24800, cssSource: 485000, cssGzip: 80000 });
assert(jsBytes <= budgets.totalJavaScript, `V8 total JavaScript budget exceeded: ${jsBytes} bytes.`);
assert(jsGzipBytes <= budgets.totalJavaScriptGzip, `V8 total JavaScript gzip budget exceeded: ${jsGzipBytes} bytes.`);
assert(eagerJsBytes <= budgets.eagerJavaScript, `V8 eager JavaScript budget exceeded: ${eagerJsBytes} bytes.`);
assert(eagerJsGzipBytes <= budgets.eagerJavaScriptGzip, `V8 eager JavaScript gzip budget exceeded: ${eagerJsGzipBytes} bytes.`);
assert(brainSurfaceBytes <= budgets.brainSurface, `Brain lazy surface budget exceeded: ${brainSurfaceBytes} bytes.`);
assert(brainSurfaceGzipBytes <= budgets.brainSurfaceGzip, `Brain lazy surface gzip budget exceeded: ${brainSurfaceGzipBytes} bytes.`);
assert(cssBytes <= budgets.cssSource, `V8 CSS source budget exceeded: ${cssBytes} bytes.`);
assert(cssGzipBytes <= budgets.cssGzip, `V8 CSS gzip budget exceeded: ${cssGzipBytes} bytes.`);

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Production validation: PASS (${assets.length} cached assets, ${eagerJsBytes}/${eagerJsGzipBytes} eager JS source/gzip bytes, ${jsBytes}/${jsGzipBytes} total JS source/gzip bytes, ${brainSurfaceBytes}/${brainSurfaceGzipBytes} Brain source/gzip bytes, ${cssBytes}/${cssGzipBytes} CSS source/gzip bytes)`);
}
