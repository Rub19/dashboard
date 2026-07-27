import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".mjs", ".ps1", ".sql", ".toml", ".webmanifest", ".yaml", ".yml"]);
const SKIPPED_DIRECTORIES = new Set([".git", "dist", "docs", "node_modules"]);
const APPROVED_INNER_HTML = new Set(["v8/app/app-runtime.mjs", "v8/ui/shell.mjs", "v8/pages/connections.mjs"]);
const APPROVED_SERVICE_ROLE_REFERENCES = new Set([
  "scripts/audit-security.mjs",
  "scripts/precommit-upload-check.mjs",
  "supabase/migrations/202607140002_public_profile_directory.sql",
  "supabase/migrations/202607260001_user_provider_credentials.sql",
  "supabase/migrations/202607270001_user_oauth_tokens.sql",
  "tests/upload-safety.test.mjs"
]);
const APPROVED_WORKER_REFERENCES = new Set(["v8/services/external-services-config.mjs", "index.html"]);

function listTextFiles(root) {
  const files = [];
  function walk(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) return;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
    });
  }
  walk(root);
  return files;
}

function privateSecretPatterns() {
  return [
    ["service-role-reference", new RegExp(["service", "role"].join("[_-]?"), "i")],
    ["github-token", new RegExp(`${"gh"}p_[A-Za-z0-9_]{20,}`)],
    ["github-fine-grained-token", new RegExp(`${"github"}_pat_[A-Za-z0-9_]{20,}`)],
    ["private-api-key", new RegExp(`${"sk"}-[A-Za-z0-9_-]{20,}`)],
    ["google-api-key", new RegExp(`${"AIza"}[0-9A-Za-z_-]{30,}`)],
    ["private-key-block", new RegExp(["BEGIN", "PRIVATE", "KEY"].join("[ -](?:RSA[ -]|EC[ -]|OPENSSH[ -])?"), "i")]
  ];
}

function checkExternalScripts(source, failures) {
  const scripts = [...source.matchAll(/<script\b([^>]*\bsrc="https:[^"]+"[^>]*)><\/script>/g)].map((match) => match[1]);
  scripts.forEach((attributes) => {
    if (!/\bintegrity="sha384-[A-Za-z0-9+/=]+"/.test(attributes)) failures.push("External script is missing SHA-384 integrity");
    if (!/\bcrossorigin="anonymous"/.test(attributes)) failures.push("External script is missing anonymous CORS mode");
  });
}

function checkWorkflow(source, failures) {
  const refs = [...source.matchAll(/uses:\s*[^\s@]+@([^\s#]+)/g)].map((match) => match[1]);
  refs.forEach((reference) => {
    if (!/^[a-f0-9]{40}$/.test(reference)) failures.push(`GitHub Action is not pinned to a commit SHA: ${reference}`);
  });
  if (!/persist-credentials:\s*false/.test(source)) failures.push("Git checkout credentials remain persisted");
}

export function auditRepository(rootInput = path.resolve(import.meta.dirname, "..")) {
  const root = path.resolve(rootInput);
  const failures = [];
  const files = listTextFiles(root);
  const secretPatterns = privateSecretPatterns();

  files.forEach((absolute) => {
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    const source = fs.readFileSync(absolute, "utf8");
    const productionSource = relative === "sw.js" || relative.startsWith("v8/") || relative === "index.html" || relative === "404.html";

    if (/\.(?:map)$/i.test(relative)) failures.push(`Source map must not ship: ${relative}`);
    if (productionSource && /\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/.test(source)) failures.push(`Dangerous JavaScript execution sink: ${relative}`);
    if (productionSource && /\son(?:click|load|error|submit)\s*=\s*["']/i.test(source)) failures.push(`Inline event handler: ${relative}`);
    if (productionSource && /\b(?:TODO|FIXME|HACK|WIP)\b|console\.(?:log|debug)\s*\(/.test(source)) failures.push(`Temporary or debug code: ${relative}`);
    if (productionSource && /\.innerHTML\s*=/.test(source) && !APPROVED_INNER_HTML.has(relative)) failures.push(`Unapproved innerHTML sink: ${relative}`);
    if (productionSource && /options\.html/.test(source)) failures.push(`Generic raw HTML option: ${relative}`);
    if (productionSource && /target:\s*["']_blank["']/.test(source) && !/rel:\s*["']noopener noreferrer["']/.test(source)) failures.push(`Unsafe new-tab link: ${relative}`);
    if (productionSource && /rub19-mailpro\.workers\.dev/.test(source) && !APPROVED_WORKER_REFERENCES.has(relative)) {
      failures.push(`Unapproved Worker dependency outside the central config or CSP: ${relative}`);
    }

    if (!relative.endsWith("scripts/validate-production.mjs")) {
      secretPatterns.forEach(([name, pattern]) => {
        if (name === "service-role-reference" && APPROVED_SERVICE_ROLE_REFERENCES.has(relative)) return;
        if (pattern.test(source)) failures.push(`Possible private secret: ${relative}`);
      });
    }
  });

  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/deploy-pages.yml"), "utf8");
  checkExternalScripts(index, failures);
  checkWorkflow(workflow, failures);

  if (files.some((file) => file.toLowerCase().endsWith(".map"))) failures.push("Source maps are present in the repository");

  return Object.freeze({
    failures: Object.freeze([...new Set(failures)].sort()),
    scannedFiles: files.length
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = auditRepository();
  if (report.failures.length) {
    report.failures.forEach((failure) => process.stderr.write(`SECURITY FAIL: ${failure}\n`));
    process.exitCode = 1;
  } else {
    process.stdout.write(`Security audit: PASS (${report.scannedFiles} files scanned)\n`);
  }
}
