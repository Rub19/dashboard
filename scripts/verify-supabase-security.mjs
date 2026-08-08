import { pathToFileURL } from "node:url";
import { PUBLIC_AUTH_CONFIG } from "../v8/services/public-auth-config.mjs";

const REQUIRED_TABLES = Object.freeze(["dashboard_data", "profiles", "ethone_user_state", "ethone_public_profiles", "ethone_brain_memories"]);
const MAX_JSON_BYTES = 1024 * 1024;

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), timeoutMs);
  return Object.freeze({ signal: controller.signal, release: () => clearTimeout(timer) });
}

async function requestJson(fetcher, url, options = {}) {
  const timeout = timeoutSignal(options.timeoutMs || 8000);
  try {
    const response = await fetcher(url, { ...options, signal: timeout.signal });
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) throw new Error("Supabase response exceeded the size limit");
    const source = await response.text();
    if (new TextEncoder().encode(source).byteLength > MAX_JSON_BYTES) throw new Error("Supabase response exceeded the size limit");
    let data = null;
    try { data = source ? JSON.parse(source) : null; } catch { throw new Error("Supabase returned invalid JSON"); }
    return Object.freeze({ ok: response.ok, status: response.status, data });
  } finally {
    timeout.release();
  }
}

export function evaluateAuthSettings(settings = {}) {
  const failures = [];
  const external = settings.external && typeof settings.external === "object" ? settings.external : {};
  if (settings.disable_signup === true) failures.push("Supabase e-mail registration is disabled");
  if (external.anonymous_users !== false) failures.push("Supabase anonymous users must be disabled");
  if (external.email !== true) failures.push("Supabase e-mail authentication is disabled");
  if (external.google !== true) failures.push("Supabase Google OAuth is disabled");
  if (external.github !== true) failures.push("Supabase GitHub OAuth is disabled");
  return failures;
}

function bearerHeaders(config, accessToken = config.supabaseAnonKey) {
  return Object.freeze({
    apikey: config.supabaseAnonKey,
    authorization: `Bearer ${accessToken}`,
    accept: "application/json"
  });
}

async function verifyAnonymousAccess(fetcher, config, failures, checks) {
  for (const table of REQUIRED_TABLES) {
    const url = `${config.supabaseUrl}/rest/v1/${table}?select=*&limit=1`;
    const response = await requestJson(fetcher, url, { headers: bearerHeaders(config), timeoutMs: 8000 });
    checks.push(`anonymous:${table}:${response.status}`);
    if (![401, 403].includes(response.status)) failures.push(`Anonymous REST access is not denied for public.${table} (HTTP ${response.status})`);
  }
  const rpc = await requestJson(fetcher, `${config.supabaseUrl}/rest/v1/rpc/find_ethone_public_profile`, {
    method: "POST",
    headers: { ...bearerHeaders(config), "content-type": "application/json" },
    body: JSON.stringify({ requested_username: "security-audit" }),
    timeoutMs: 8000
  });
  checks.push(`anonymous:find-public-profile:${rpc.status}`);
  if (![401, 403].includes(rpc.status)) failures.push(`Anonymous public-profile RPC access is not denied (HTTP ${rpc.status})`);
}

async function signInQaUser(fetcher, config, email, password) {
  const response = await requestJson(fetcher, `${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: config.supabaseAnonKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password }),
    timeoutMs: 10000
  });
  if (!response.ok || !response.data?.access_token || !response.data?.user?.id) throw new Error(`Dedicated RLS QA login failed (HTTP ${response.status})`);
  return Object.freeze({ id: String(response.data.user.id), accessToken: String(response.data.access_token) });
}

function rlsTables(environment) {
  return String(environment.ETHONE_RLS_TABLES || "dashboard_data:user_id,profiles:user_id,ethone_user_state:user_id,ethone_public_profiles:user_id,ethone_brain_memories:user_id")
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter(([table, owner]) => /^[a-z_][a-z0-9_]*$/.test(table || "") && /^[a-z_][a-z0-9_]*$/.test(owner || ""))
    .map(([table, owner]) => Object.freeze({ table, owner }));
}

async function verifyTwoUserIsolation(fetcher, config, environment, failures, checks) {
  const enforce = environment.ETHONE_ENFORCE_RLS_QA === "1";
  if (!enforce) {
    checks.push("two-user-rls:skipped");
    return;
  }
  const credentials = [
    { email: environment.ETHONE_RLS_USER_A_EMAIL, password: environment.ETHONE_RLS_USER_A_PASSWORD },
    { email: environment.ETHONE_RLS_USER_B_EMAIL, password: environment.ETHONE_RLS_USER_B_PASSWORD }
  ];
  if (credentials.some((entry) => !entry.email || !entry.password)) {
    failures.push("Two-user RLS QA is enforced but dedicated credentials are incomplete");
    return;
  }

  let users;
  try {
    users = await Promise.all(credentials.map((entry) => signInQaUser(fetcher, config, entry.email, entry.password)));
  } catch (error) {
    failures.push(String(error?.message || "Dedicated RLS QA login failed"));
    return;
  }

  for (const { table, owner } of rlsTables(environment)) {
    for (let index = 0; index < users.length; index += 1) {
      const user = users[index];
      const other = users[index === 0 ? 1 : 0];
      const ownUrl = `${config.supabaseUrl}/rest/v1/${table}?select=${owner}&limit=100`;
      const own = await requestJson(fetcher, ownUrl, { headers: bearerHeaders(config, user.accessToken), timeoutMs: 8000 });
      if (!own.ok || !Array.isArray(own.data)) {
        failures.push(`Authenticated RLS read failed for public.${table} (HTTP ${own.status})`);
        continue;
      }
      if (own.data.some((row) => String(row?.[owner]) !== user.id)) failures.push(`Cross-user rows are visible in public.${table}`);

      const crossUrl = `${config.supabaseUrl}/rest/v1/${table}?select=${owner}&${owner}=eq.${encodeURIComponent(other.id)}&limit=1`;
      const cross = await requestJson(fetcher, crossUrl, { headers: bearerHeaders(config, user.accessToken), timeoutMs: 8000 });
      if (!cross.ok || !Array.isArray(cross.data) || cross.data.length) failures.push(`Explicit cross-user filter escaped RLS in public.${table}`);
      checks.push(`rls:${table}:user-${index + 1}`);
    }
  }

  for (let index = 0; index < users.length; index += 1) {
    const rpc = await requestJson(fetcher, `${config.supabaseUrl}/rest/v1/rpc/find_ethone_public_profile`, {
      method: "POST",
      headers: { ...bearerHeaders(config, users[index].accessToken), "content-type": "application/json" },
      body: JSON.stringify({ requested_username: "security-audit" }),
      timeoutMs: 8000
    });
    checks.push(`rpc-denied:find-public-profile:user-${index + 1}:${rpc.status}`);
    if (![401, 403].includes(rpc.status)) failures.push(`Authenticated browser can execute the server-only public-profile RPC (HTTP ${rpc.status})`);
  }
}

export async function verifySupabaseSecurity(options = {}) {
  const fetcher = options.fetch || globalThis.fetch;
  const config = options.config || PUBLIC_AUTH_CONFIG;
  const environment = options.environment || process.env;
  const failures = [];
  const checks = [];
  if (typeof fetcher !== "function") return Object.freeze({ ok: false, failures: Object.freeze(["Fetch is unavailable"]), checks: Object.freeze([]) });
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "") || !config.supabaseAnonKey) {
    return Object.freeze({ ok: false, failures: Object.freeze(["Public Supabase configuration is invalid"]), checks: Object.freeze([]) });
  }

  try {
    const health = await requestJson(fetcher, `${config.supabaseUrl}/auth/v1/health`, { headers: { apikey: config.supabaseAnonKey }, timeoutMs: 8000 });
    checks.push(`auth-health:${health.status}`);
    if (!health.ok) failures.push(`Supabase Auth health failed (HTTP ${health.status})`);

    const settings = await requestJson(fetcher, `${config.supabaseUrl}/auth/v1/settings`, { headers: { apikey: config.supabaseAnonKey }, timeoutMs: 8000 });
    checks.push(`auth-settings:${settings.status}`);
    if (!settings.ok) failures.push(`Supabase Auth settings failed (HTTP ${settings.status})`);
    else failures.push(...evaluateAuthSettings(settings.data));

    await verifyAnonymousAccess(fetcher, config, failures, checks);
    await verifyTwoUserIsolation(fetcher, config, environment, failures, checks);
  } catch (error) {
    failures.push(String(error?.message || "Supabase security preflight failed").slice(0, 240));
  }

  return Object.freeze({ ok: failures.length === 0, failures: Object.freeze([...new Set(failures)]), checks: Object.freeze(checks) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await verifySupabaseSecurity();
  if (report.ok) {
    process.stdout.write(`Supabase security preflight: PASS (${report.checks.length} checks)\n`);
  } else {
    report.failures.forEach((failure) => process.stderr.write(`SUPABASE SECURITY FAIL: ${failure}\n`));
    process.exitCode = 1;
  }
}
