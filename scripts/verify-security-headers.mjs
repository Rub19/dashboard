const target = process.argv[2] || "https://ethone.dev/";
const attempts = Math.max(1, Number(process.argv[3] || 8));
const delayMs = Math.max(250, Number(process.argv[4] || 5000));

const requiredHeaders = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "content-security-policy",
];

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
    return { ok: response.ok, status: response.status, headers: response.headers };
  } finally {
    clearTimeout(timer);
  }
}

async function verify() {
  const response = await fetchWithTimeout(target);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const missing = requiredHeaders.filter((h) => !response.headers.get(h));
  if (missing.length) throw new Error(`Missing security headers: ${missing.join(", ")}`);
  const csp = response.headers.get("content-security-policy") || "";
  if (!/default-src\s+'self'/.test(csp) || !/frame-ancestors\s+'none'/.test(csp)) {
    throw new Error("CSP policy is missing baseline directives");
  }
  const hsts = response.headers.get("strict-transport-security") || "";
  if (!/max-age=\d+/.test(hsts) || Number(hsts.match(/max-age=(\d+)/)?.[1]) < 31536000) {
    throw new Error("HSTS max-age is missing or too low");
  }
  return { status: response.status };
}

let lastError = null;
let verified = false;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const result = await verify();
    console.log(`Security headers verification: PASS (${target}, HTTP ${result.status})`);
    verified = true;
    break;
  } catch (error) {
    lastError = error;
    console.warn(`Security headers verification attempt ${attempt}/${attempts}: ${error.message}`);
    if (attempt < attempts) await wait(delayMs);
  }
}

if (!verified) {
  console.error(`Security headers verification: FAIL (${lastError?.message || "unknown error"})`);
  process.exitCode = 1;
}
