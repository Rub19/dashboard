import { pathToFileURL } from "node:url";

function value(headers, name) {
  return String(headers?.get?.(name) || "").trim();
}

export function evaluateSecurityHeaders(headers, options = {}) {
  const failures = [];
  const csp = value(headers, "content-security-policy");
  const hsts = value(headers, "strict-transport-security");
  const permissions = value(headers, "permissions-policy");
  const cache = value(headers, "cache-control");
  if (!/default-src\s+'self'/i.test(csp) || !/script-src-attr\s+'none'/i.test(csp) || !/object-src\s+'none'/i.test(csp) || !/base-uri\s+'self'/i.test(csp)) failures.push("HTTP Content-Security-Policy is incomplete");
  if (!/frame-ancestors\s+'none'/i.test(csp)) failures.push("HTTP CSP does not block framing");
  if (/unsafe-eval/i.test(csp)) failures.push("HTTP CSP permits unsafe-eval");
  if (!/max-age=(?:3[1-9]\d{6,}|[4-9]\d{7,})/i.test(hsts) || !/includeSubDomains/i.test(hsts)) failures.push("HSTS is missing or too short");
  if (value(headers, "x-content-type-options").toLowerCase() !== "nosniff") failures.push("X-Content-Type-Options must be nosniff");
  if (value(headers, "x-frame-options").toUpperCase() !== "DENY") failures.push("X-Frame-Options must be DENY");
  if (value(headers, "referrer-policy").toLowerCase() !== "strict-origin-when-cross-origin") failures.push("Referrer-Policy is incomplete");
  if (!/camera=\(\)/i.test(permissions) || !/microphone=\(\)/i.test(permissions) || !/geolocation=\(\)/i.test(permissions)) failures.push("Permissions-Policy is incomplete");
  if (value(headers, "cross-origin-opener-policy").toLowerCase() !== "same-origin-allow-popups") failures.push("Cross-Origin-Opener-Policy is incomplete");
  if (options.requireNoStore && !/no-store/i.test(cache)) failures.push("Sensitive shell resource is cacheable");
  if (options.requireCloudflare && !value(headers, "cf-ray")) failures.push("Canonical domain is not served through Cloudflare");
  return failures;
}

async function fetchWithTimeout(fetcher, url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), options.timeoutMs || 10000);
  try {
    return await fetcher(url, { cache: "no-store", ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function verifySecurityHeaders(options = {}) {
  const fetcher = options.fetch || globalThis.fetch;
  const target = new URL(options.target || "https://ethone.dev/");
  const failures = [];
  const checks = [];
  if (target.protocol !== "https:") return Object.freeze({ ok: false, failures: Object.freeze(["Canonical target must use HTTPS"]), checks: Object.freeze([]) });

  try {
    const insecure = new URL(target);
    insecure.protocol = "http:";
    const redirect = await fetchWithTimeout(fetcher, insecure, { redirect: "manual" });
    const location = value(redirect.headers, "location");
    checks.push(`http-redirect:${redirect.status}`);
    if (![301, 302, 307, 308].includes(redirect.status) || !location || new URL(location, insecure).protocol !== "https:") failures.push("HTTP does not redirect directly to HTTPS");

    const page = await fetchWithTimeout(fetcher, target, { redirect: "follow" });
    checks.push(`html:${page.status}`);
    if (!page.ok) failures.push(`Canonical HTML returned HTTP ${page.status}`);
    if (new URL(page.url).origin !== target.origin) failures.push("Canonical HTML redirected to another origin");
    failures.push(...evaluateSecurityHeaders(page.headers, { requireNoStore: true, requireCloudflare: true }));

    const worker = await fetchWithTimeout(fetcher, new URL("/sw.js", target), { redirect: "follow" });
    checks.push(`sw:${worker.status}`);
    if (!worker.ok) failures.push(`Service Worker returned HTTP ${worker.status}`);
    if (!/no-store/i.test(value(worker.headers, "cache-control"))) failures.push("Service Worker is cacheable");
    if (value(worker.headers, "service-worker-allowed") !== "/") failures.push("Service-Worker-Allowed must be /");
    if (!value(worker.headers, "cf-ray")) failures.push("Service Worker bypasses the Cloudflare edge");

    const manifest = await fetchWithTimeout(fetcher, new URL("/manifest.webmanifest", target), { redirect: "follow" });
    checks.push(`manifest:${manifest.status}`);
    if (!manifest.ok) failures.push(`Manifest returned HTTP ${manifest.status}`);
    if (!/no-store/i.test(value(manifest.headers, "cache-control"))) failures.push("Manifest is cacheable");
  } catch (error) {
    failures.push(String(error?.message || "Canonical edge verification failed").slice(0, 240));
  }

  return Object.freeze({ ok: failures.length === 0, failures: Object.freeze([...new Set(failures)]), checks: Object.freeze(checks) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await verifySecurityHeaders({ target: process.argv[2] || "https://ethone.dev/" });
  if (report.ok) {
    process.stdout.write(`Canonical security headers: PASS (${report.checks.length} checks)\n`);
  } else {
    report.failures.forEach((failure) => process.stderr.write(`EDGE SECURITY FAIL: ${failure}\n`));
    process.exitCode = 1;
  }
}
