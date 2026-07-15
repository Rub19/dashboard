import { readFileSync } from "node:fs";

const target = process.argv[2];
const attempts = Math.max(1, Number(process.argv[3] || 8));
const delayMs = Math.max(250, Number(process.argv[4] || 5000));

const localWorker = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const expectedWorkerVersion = localWorker.match(/const ETHONE_VERSION = "([^"]+)"/)?.[1] || "";
if (!/^\d{4}-\d{2}-\d{2}-experience-v\d+$/.test(expectedWorkerVersion)) {
  throw new Error("Local Service Worker release marker is missing or invalid");
}

if (!target) {
  console.error("Usage: node scripts/verify-deployment.mjs <url> [attempts] [delayMs]");
  process.exitCode = 2;
  throw new Error("Deployment target is required");
}

const baseUrl = new URL(target);
baseUrl.pathname = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : `${baseUrl.pathname}/`;
baseUrl.search = "";
baseUrl.hash = "";

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function fetchWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: { "cache-control": "no-cache", pragma: "no-cache" }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function verify() {
  const nonce = Date.now();
  const pageUrl = new URL(`./?ethone-release-check=${nonce}`, baseUrl);
  const page = await fetchWithTimeout(pageUrl);
  if (!page.ok) throw new Error(`HTML returned HTTP ${page.status}`);
  const html = await page.text();
  if (!html.includes('data-ethone-entry="v8-only"')) throw new Error("HTML is not the V8-only entry");
  if (!html.includes('src="./v8/main.mjs"')) throw new Error("V8 module entry is missing");
  if (!html.includes("@supabase/supabase-js@2.110.1")) throw new Error("Supabase dependency is not pinned");

  const [moduleResponse, workerResponse, manifestResponse, faviconResponse, maskIconResponse] = await Promise.all([
    fetchWithTimeout(new URL(`./v8/main.mjs?ethone-release-check=${nonce}`, baseUrl)),
    fetchWithTimeout(new URL(`./sw.js?ethone-release-check=${nonce}`, baseUrl)),
    fetchWithTimeout(new URL(`./manifest.webmanifest?ethone-release-check=${nonce}`, baseUrl)),
    fetchWithTimeout(new URL(`./icons/ethone-favicon-32.png?ethone-release-check=${nonce}`, baseUrl)),
    fetchWithTimeout(new URL(`./icons/ethone-mask-icon.svg?ethone-release-check=${nonce}`, baseUrl))
  ]);
  if (!moduleResponse.ok) throw new Error(`V8 module returned HTTP ${moduleResponse.status}`);
  if (!workerResponse.ok) throw new Error(`Service Worker returned HTTP ${workerResponse.status}`);
  if (!manifestResponse.ok) throw new Error(`Manifest returned HTTP ${manifestResponse.status}`);
  if (!faviconResponse.ok || !String(faviconResponse.headers.get("content-type") || "").includes("image/png")) throw new Error("Favicon is unavailable or has an invalid content type");
  if (!maskIconResponse.ok || !String(maskIconResponse.headers.get("content-type") || "").includes("image/svg")) throw new Error("Safari mask icon is unavailable or has an invalid content type");

  const worker = await workerResponse.text();
  if (!worker.includes(`const ETHONE_VERSION = "${expectedWorkerVersion}"`)) throw new Error("Service Worker release marker is stale");
  const manifest = await manifestResponse.json();
  if (manifest.id !== "./" || manifest.start_url !== "./") throw new Error("Manifest scope is invalid");
  if (!manifest.icons?.some((icon) => icon.src === "icons/ethone-icon-maskable-512.png" && icon.purpose === "maskable")) throw new Error("Manifest maskable icon is missing");

  return { url: page.url, status: page.status };
}

let lastError = null;
let verified = false;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const result = await verify();
    console.log(`Deployment verification: PASS (${result.url}, HTTP ${result.status})`);
    verified = true;
    break;
  } catch (error) {
    lastError = error;
    console.warn(`Deployment verification attempt ${attempt}/${attempts}: ${error.message}`);
    if (attempt < attempts) await wait(delayMs);
  }
}

if (!verified) {
  console.error(`Deployment verification: FAIL (${lastError?.message || "unknown error"})`);
  process.exitCode = 1;
}
