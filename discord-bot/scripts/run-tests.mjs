#!/usr/bin/env node
// Runs every ad-hoc test_*.ts script (root + tests/) as its own tsx child
// process, in sequence, and aggregates the results. Each script already
// exits 1 on its own assertion failures (see test_afk_v1.ts's pattern) —
// this runner just discovers them and turns "some script exited non-zero"
// into a single CI-friendly pass/fail with a summary.
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');

function findTestFiles(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.startsWith('test_') && e.name.endsWith('.ts'))
    .map((e) => join(dir, e.name));
}

const files = [...findTestFiles('.'), ...findTestFiles('tests')].sort();

if (files.length === 0) {
  console.log('No test_*.ts files found.');
  process.exit(0);
}

console.log(`Running ${files.length} test script(s)...\n`);

// Each script is expected to call process.exit() itself (they all do), but
// a couple import services with un-refed-free setInterval timers (e.g.
// BotTelemetryService) — if one of those ever gets imported by a script that
// doesn't reach its own exit call (an unresolved promise, a real network
// call with no server to answer it), the child would hang forever and block
// every test after it. A hard per-file timeout turns that into a reported
// failure instead of a stuck CI job.
const PER_FILE_TIMEOUT_MS = 60000;

const results = [];
for (const file of files) {
  console.log(`─── ${file} ───`);
  const res = spawnSync(process.execPath, ['--import', 'tsx', join(root, file)], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'ci-placeholder-token',
      CLIENT_ID: process.env.CLIENT_ID || '000000000000000000',
    },
    timeout: PER_FILE_TIMEOUT_MS,
    killSignal: 'SIGKILL',
  });
  const timedOut = res.signal === 'SIGKILL' || res.error?.code === 'ETIMEDOUT';
  if (timedOut) {
    console.error(`  ⚠ timed out after ${PER_FILE_TIMEOUT_MS}ms, killed`);
  }
  results.push({ file, code: timedOut ? 1 : res.status ?? 1 });
  console.log('');
}

const failed = results.filter((r) => r.code !== 0);
console.log('='.repeat(50));
console.log(`${results.length - failed.length}/${results.length} test scripts passed`);
if (failed.length > 0) {
  console.log('Failed:');
  for (const f of failed) console.log(`  - ${f.file} (exit ${f.code})`);
  process.exit(1);
}
