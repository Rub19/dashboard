import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = path.resolve(import.meta.dirname, "..");
const MAX_REVIEW_BYTES = 5 * 1024 * 1024;
const WALK_SKIP_DIRECTORIES = new Set([
  ".git", ".agents", ".cache", ".idea", ".netlify", ".next", ".nuxt", ".supabase", ".temp", ".tmp", ".turbo", ".vercel", ".vite", ".vscode", ".wrangler",
  "artifacts", "build", "cache", "captures", "coverage", "development-only", "dist", "local-only", "logs", "node_modules", "out", "playwright-report", "private", "screenshots", "secrets", "security-reports", "sessions", "temp", "test-results", "tmp"
]);

const FORBIDDEN_PATH_RULES = Object.freeze([
  [/^\.env(?:\.|$)/i, "environment file"],
  [/^\.dev\.vars(?:\.|$)/i, "Cloudflare local variables"],
  [/(^|\/)(?:local-only|private|secrets|development-only|credentials)(?:\/|$)/i, "local or private directory"],
  [/(^|\/)(?:node_modules|dist|build|out|coverage|artifacts|screenshots|captures|security-reports|playwright-report|test-results)(?:\/|$)/i, "generated dependency, build or report"],
  [/(^|\/)(?:\.cache|cache|\.tmp|tmp|\.temp|temp|\.wrangler|\.vercel|\.netlify|\.supabase)(?:\/|$)/i, "local tool state or cache"],
  [/(^|\/)supabase\/\.temp(?:\/|$)/i, "Supabase local state"],
  [/(^|\/)(?:\.idea|\.vscode)(?:\/|$)|\.code-workspace$/i, "personal editor configuration"],
  [/(^|\/)playwright\/\.auth(?:\/|$)|(^|\/)(?:cookies?|sessions?|auth-state|storage-state)(?:\/|$)/i, "browser authentication or session data"],
  [/(?:^|\/)(?:client_secret|oauth-secret|secrets?|credentials?|service-account)[^/]*\.json$/i, "credential or secret JSON export"],
  [/\.(?:pem|key|p12|pfx|crt|cer|jks|keystore|mobileprovision)$/i, "private key or certificate"],
  [/\.(?:db|sqlite|sqlite3|db-journal|db-shm|db-wal)$/i, "local database"],
  [/\.(?:log|dmp|dump|map|har)$/i, "log, crash dump, source map or browser trace"],
  [/\.(?:bak|backup|old|orig|tmp|temp|swp|swo|zip|7z|rar|tar|tgz|tar\.gz)$/i, "backup, temporary file or local archive"]
]);

function normalizedPath(file) {
  return String(file || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

export function forbiddenPathReason(file) {
  const relative = normalizedPath(file);
  if (!relative || relative === ".env.example") return null;
  for (const [pattern, reason] of FORBIDDEN_PATH_RULES) {
    if (pattern.test(relative)) return reason;
  }
  return null;
}

function secretFormatPatterns() {
  return Object.freeze([
    ["GitHub personal access token", new RegExp(`${"gh"}p_[A-Za-z0-9_]{20,}`)],
    ["GitHub fine-grained token", new RegExp(`${"github"}_pat_[A-Za-z0-9_]{20,}`)],
    ["OpenAI-style private key", new RegExp(`${"sk"}-[A-Za-z0-9_-]{20,}`)],
    ["Stripe live secret key", new RegExp(`${"sk"}_live_[A-Za-z0-9]{16,}`)],
    ["Google API key", new RegExp(`${"AI"}za[0-9A-Za-z_-]{30,}`)],
    ["AWS access key", new RegExp(`${"AK"}IA[0-9A-Z]{16}`)],
    ["Slack access token", new RegExp(`${"xo"}x[baprs]-[A-Za-z0-9-]{20,}`)],
    ["private key block", new RegExp(["BEGIN", "PRIVATE", "KEY"].join("[ -](?:RSA[ -]|EC[ -]|OPENSSH[ -])?"), "i")],
    ["credential embedded in URL", /https?:\/\/[^\s/:]+:[^\s/@]+@/i]
  ]);
}

function placeholderValue(value) {
  const clean = String(value || "").trim().toLowerCase();
  return !clean
    || clean.startsWith("${")
    || clean.startsWith("<")
    || /^(?:example|sample|dummy|placeholder|replace|redacted|your[-_]|not[-_]?a[-_]?real|change[-_]?me|test[-_]?only|none|null|undefined|x{4,}|\*{4,})/.test(clean)
    || clean.includes("mock")
    || /^test[-_]/.test(clean)
    || clean.includes("process.env")
    || clean.includes("import.meta.env")
    || clean.includes("deno.env")
    || clean.includes("secrets.");
}

function sensitiveAssignmentName(value) {
  const source = String(value || "");
  const compact = source.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/(?:show|hide|toggle|reveal)password$/.test(compact)) return false;
  if (source === source.toUpperCase()) return true;
  return /(?:apikey|clientsecret|servicerole(?:key)?|accesstoken|refreshtoken|githubtoken|cloudflare(?:apitoken|accountid)|privatekey|password|passwd|credentials?)$/.test(compact);
}

function serviceRoleJwt(source) {
  const tokens = String(source || "").match(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g) || [];
  return tokens.some((token) => {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      return payload?.role === "service_role" || payload?.app_metadata?.role === "service_role";
    } catch {
      return false;
    }
  });
}

const SKIP_SENSITIVE_ASSIGNMENT = /(?:\/(?:i18n|locales)\/|i18n\.(?:ts|js|mjs)$|\.test\.(?:mjs|js|ts)$)/i;

export function scanText(source, sourceName = "") {
  const text = String(source || "");
  const findings = new Set();
  secretFormatPatterns().forEach(([reason, pattern]) => {
    if (pattern.test(text)) findings.add(reason);
  });
  if (serviceRoleJwt(text)) findings.add("Supabase service_role JWT");

  if (!SKIP_SENSITIVE_ASSIGNMENT.test(sourceName)) {
    const assignment = /\b([A-Za-z][A-Za-z0-9_.-]*(?:api[_-]?key|client[_-]?secret|service[_-]?role(?:[_-]?key)?|access[_-]?token|refresh[_-]?token|github[_-]?token|cloudflare[_-]?(?:api[_-]?token|account[_-]?id)|private[_-]?key|password|passwd|credentials?)[A-Za-z0-9_.-]*)\b\s*(?:=|:)\s*["'`]([^"'`\r\n]{6,})["'`]/gi;
    let match = assignment.exec(text);
    while (match) {
      if (sensitiveAssignmentName(match[1]) && !placeholderValue(match[2])) findings.add(`hardcoded sensitive value (${match[1]})`);
      match = assignment.exec(text);
    }
  }
  return Object.freeze([...findings]);
}

function isBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
}

export function scanPaths(rootInput, relativePaths) {
  const root = path.resolve(rootInput);
  const issues = [];
  [...new Set(relativePaths.map(normalizedPath).filter(Boolean))].sort().forEach((relative) => {
    const reason = forbiddenPathReason(relative);
    if (reason) issues.push({ file: relative, reason });
    const absolute = path.resolve(root, relative);
    if (path.relative(root, absolute).startsWith("..") || !fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile()) return;
    if (stat.size > MAX_REVIEW_BYTES) {
      issues.push({ file: relative, reason: `file exceeds the ${MAX_REVIEW_BYTES / 1024 / 1024} MB review limit` });
      return;
    }
    const buffer = fs.readFileSync(absolute);
    if (isBinary(buffer)) return;
    scanText(buffer.toString("utf8"), relative).forEach((finding) => issues.push({ file: relative, reason: finding }));
  });
  const unique = new Map(issues.map((issue) => [`${issue.file}\0${issue.reason}`, issue]));
  return Object.freeze([...unique.values()]);
}

function collectWorkspaceFiles(root) {
  const files = [];
  function walk(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      if (entry.isDirectory() && WALK_SKIP_DIRECTORIES.has(entry.name)) return;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(normalizedPath(path.relative(root, absolute)));
    });
  }
  walk(root);
  return files;
}

function gitOutput(root, args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
}

function validGitRepository(root) {
  const result = gitOutput(root, ["rev-parse", "--is-inside-work-tree"]);
  return result.status === 0 && result.stdout.trim() === "true";
}

function gitFiles(root, allFiles) {
  const args = allFiles
    ? ["ls-files", "-co", "--exclude-standard", "-z"]
    : ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"];
  const result = gitOutput(root, args);
  if (result.status !== 0) throw new Error("Unable to read Git candidate files.");
  return result.stdout.split("\0").filter(Boolean);
}

export function runUploadSafetyCheck(rootInput = DEFAULT_ROOT, options = {}) {
  const root = path.resolve(rootInput);
  const allFiles = options.all === true;
  const gitReady = validGitRepository(root);
  const files = gitReady ? gitFiles(root, allFiles) : collectWorkspaceFiles(root);
  return Object.freeze({
    files: Object.freeze(files),
    gitReady,
    issues: scanPaths(root, files),
    mode: gitReady ? (allFiles ? "repository" : "staged") : "workspace"
  });
}

function printReport(report) {
  if (report.issues.length) {
    process.stderr.write(`UPLOAD BLOCKED: ${report.issues.length} issue(s) detected. Secret values are never printed.\n`);
    report.issues.forEach((issue) => process.stderr.write(`- ${issue.file}: ${issue.reason}\n`));
    process.exitCode = 1;
    return;
  }
  const gitNote = report.gitReady ? "" : " (Git metadata unavailable; workspace fallback used)";
  process.stdout.write(`Upload safety check: PASS (${report.files.length} files, ${report.mode} mode)${gitNote}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  printReport(runUploadSafetyCheck(DEFAULT_ROOT, { all: process.argv.includes("--all") }));
}
