import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

// Le stockage écrit dans ./data : on travaille dans un dossier temporaire.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-scan-'));
process.chdir(tmpDir);

const { scoreOf, buildScanReport } = await import('../src/modules/server/services/securityScanService.js');

const check = (id: string, ok: boolean, severity: 'important' | 'review' | 'suggestion') =>
  ({ id, category: 'roles' as const, severity, title: `Point ${id}`, ok });

// Score pondéré : important = 3, à examiner = 2, suggestion = 1.
assert.equal(scoreOf([]), 100);
assert.equal(scoreOf([check('a', true, 'important'), check('b', false, 'suggestion')]), 75);
assert.equal(scoreOf([check('a', false, 'important'), check('b', true, 'suggestion')]), 25);

const guild = { id: '123' } as any;
const previous = { checks: [check('a', false, 'important'), check('b', false, 'review')], scannedAt: '', memberCount: 5, score: 0, sensitiveRoles: [] };
const current = { checks: [check('a', true, 'important'), check('b', false, 'review'), check('c', false, 'suggestion')], scannedAt: '', memberCount: 5, score: 50, sensitiveRoles: [] };

const report = JSON.stringify(buildScanReport(guild, current as any, previous as any).components[0].toJSON());
assert.ok(report.includes('50/100'), 'score affiché');
assert.ok(report.includes('+50 depuis le dernier scan'), 'écart de score');
assert.ok(report.includes('Nouveaux points') && report.includes('Point c'), 'nouveau point listé');
assert.ok(report.includes('Corrigés') && report.includes('Point a'), 'point corrigé listé');
assert.ok(!report.includes('Point b'), 'point inchangé non répété quand il y a des nouveautés');
assert.ok(report.includes('guildId=123'), 'lien vers le rapport du serveur');

const first = JSON.stringify(buildScanReport(guild, current as any, null).components[0].toJSON());
assert.ok(first.includes('Premier rapport') && first.includes('Point b') && first.includes('Point c'), 'premier rapport : liste à régler');

console.log('✅ scan de sécurité : score et rapport OK');
process.chdir(os.tmpdir());
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
