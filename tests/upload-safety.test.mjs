import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { forbiddenPathReason, scanText } from "../scripts/precommit-upload-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("upload guard rejects local, generated and credential paths", () => {
  assert.equal(forbiddenPathReason(".env.production"), "environment file");
  assert.equal(forbiddenPathReason("local-only/session.json"), "local or private directory");
  assert.equal(forbiddenPathReason("node_modules/tool/index.js"), "generated dependency, build or report");
  assert.equal(forbiddenPathReason("artifacts/dashboard.png"), "generated dependency, build or report");
  assert.equal(forbiddenPathReason("backup/export.sqlite"), "local database");
  assert.equal(forbiddenPathReason(".env.example"), null);
  assert.equal(forbiddenPathReason("v8/main.mjs"), null);
});

test("upload guard detects token formats and service-role JWTs without printing values", () => {
  const githubToken = `${["gh", "p_"].join("")}${"A".repeat(24)}`;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const serviceRoleJwt = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role: "service_role" })}.${"a".repeat(16)}`;
  const findings = scanText(`TOKEN = "${githubToken}"\nAUTH = "${serviceRoleJwt}"`);
  assert.ok(findings.includes("GitHub personal access token"));
  assert.ok(findings.includes("Supabase service_role JWT"));
  assert.ok(findings.every((finding) => !finding.includes(githubToken) && !finding.includes(serviceRoleJwt)));
});

test("upload guard accepts environment and GitHub Secrets references", () => {
  assert.deepEqual(scanText('PASSWORD: "${{ secrets.TEST_PASSWORD }}"\nconst accessToken = process.env.ACCESS_TOKEN;\nshowPassword: "Show password"\nhidePassword: "Hide password"'), []);
});

test("ETHONE gitignore covers every local safety boundary", () => {
  const ignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  for (const entry of [".env.*", "local-only/", "node_modules/", "dist/", "artifacts/", "coverage/", ".wrangler/", "supabase/.temp/", "*.sqlite", "*.pem", "*.map", ".vscode/"]) {
    assert.ok(ignore.includes(entry), `Missing .gitignore entry: ${entry}`);
  }
});
