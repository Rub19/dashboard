const target = process.argv[2];
const attempts = Math.max(1, Number(process.argv[3] || 8));
const delayMs = Math.max(250, Number(process.argv[4] || 5000));

if (!target) {
  console.error("Usage: node scripts/verify-deployment.mjs <url> [attempts] [delayMs]");
  process.exitCode = 2;
  throw new Error("Deployment target is required");
}

const baseUrl = new URL(target);
baseUrl.search = "";
baseUrl.hash = "";

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function fetchWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text, url: response.url };
  } finally {
    clearTimeout(timer);
  }
}

async function verify() {
  const nonce = Date.now();
  const page = await fetchWithTimeout(new URL(`./?ethone-release-check=${nonce}`, baseUrl));
  if (!page.ok) throw new Error(`HTML returned HTTP ${page.status}`);
  const isNextApp =
    page.text.includes('id="__next"') ||
    page.text.includes('/_next/static/') ||
    page.text.includes('data-v8-shell');
  if (!isNextApp) {
    throw new Error("HTML is not the ETHONE Next.js entry");
  }
  if (!page.text.includes('<title>ETHONE</title>')) throw new Error("Page title is missing");

  const [login, sw, manifest] = await Promise.all([
    fetchWithTimeout(new URL(`./login/?ethone-release-check=${nonce}`, baseUrl)),
    fetchWithTimeout(new URL(`./sw.js?ethone-release-check=${nonce}`, baseUrl)),
    fetchWithTimeout(new URL(`./manifest.json?ethone-release-check=${nonce}`, baseUrl)),
  ]);
  if (!login.ok) throw new Error(`/login returned HTTP ${login.status}`);
  if (!sw.ok) throw new Error(`Service Worker returned HTTP ${sw.status}`);
  if (!manifest.ok) throw new Error(`Manifest returned HTTP ${manifest.status}`);
  if (!sw.text.includes('const CACHE_NAME = "ethone-next-')) throw new Error("Service Worker is not the Next.js worker");
  const manifestJson = JSON.parse(manifest.text);
  if (manifestJson.name !== "ETHONE" && manifestJson.short_name !== "ETHONE") throw new Error("Manifest name is invalid");

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
