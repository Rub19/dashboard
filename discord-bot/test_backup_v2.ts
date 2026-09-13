import { backupRepository } from './src/modules/backup/storage/backupRepository.js';
import { BackupIntegrityService } from './src/modules/backup/services/backupIntegrityService.js';
import { BackupDiffService } from './src/modules/backup/services/backupDiffService.js';
import { BackupCollectorService } from './src/modules/backup/services/backupCollectorService.js';
import { BackupRestoreService } from './src/modules/backup/services/backupRestoreService.js';
import { BackupSnapshot } from './src/modules/backup/types/index.js';

let passed = 0;
let total = 0;

function assert(condition: boolean, name: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    process.exitCode = 1;
  }
}

// This suite always assumed a couple of demo BackupSnapshots already existed
// on disk for SEED_GUILD_ID (data/discord_backups.json) — that was never
// actually true (the repository has no seed/demo-data mechanism of its own),
// so every assertion downstream of `demoBackups[0]` silently depended on
// whatever was left over in the data file from a previous manual run. Build
// two real, checksum-valid snapshots up front instead, using the same
// BackupIntegrityService.computeChecksum the production code path uses, so
// the suite is self-contained and passes the same way in any environment.
const SEED_GUILD_ID = '123456789012345678';

function buildSeedSnapshot(
  backupId: string,
  name: string,
  isProtected: boolean,
  createdAt: string
): BackupSnapshot {
  const unsealed: Omit<BackupSnapshot, 'checksum' | 'sizeBytes'> = {
    backupId,
    guildId: SEED_GUILD_ID,
    name,
    description: 'Snapshot de seed généré par la suite de tests',
    createdAt,
    createdBy: { id: 'seed-user', tag: 'SeedBot#0000' },
    type: 'FULL',
    status: 'COMPLETED',
    isProtected,
    schemaVersion: BackupIntegrityService.CURRENT_SCHEMA_VERSION,
    includedComponents: ['ROLES', 'CATEGORIES', 'CHANNELS', 'PERMISSIONS', 'SERVER_CONFIG', 'EMOJIS', 'ETHONE_CONFIG'],
    objectCounts: { categories: 2, channels: 1, roles: 2, permissions: 0, emojis: 0, ethoneModules: 0 },
    data: {
      guild: { name: 'Test Server', icon: null, description: null },
      roles: [
        // @everyone must always be present in a real snapshot (Discord guilds
        // always have it) — the restore-preview safety check specifically
        // relies on this flag to prove SAFE mode never touches it.
        { id: SEED_GUILD_ID, name: '@everyone', color: 0, hoist: false, position: 0, permissions: '0', mentionable: false, managed: false, isEveryone: true },
        { id: 'role-admin', name: 'Administrateur', color: 0xff0000, hoist: true, position: 5, permissions: '8', mentionable: false, managed: false },
      ],
      categories: [
        { id: 'cat-1', name: 'Général', position: 0, permissionOverwrites: [] },
        { id: 'cat-2', name: 'Annonces', position: 1, permissionOverwrites: [] },
      ],
      channels: [
        { id: 'chan-1', name: 'general', type: 0, topic: 'Bienvenue', position: 0, permissionOverwrites: [] },
      ],
      emojis: [],
      ethoneConfig: {},
    },
  };
  const checksum = BackupIntegrityService.computeChecksum(unsealed);
  const sizeBytes = Buffer.byteLength(JSON.stringify(unsealed.data), 'utf8');
  return { ...unsealed, checksum, sizeBytes };
}

async function runTests() {
  console.log('\n=== [ETHONE BACKUP & RESTORE 2.0 — TEST SUITE] ===\n');

  const testGuildId = 'test_guild_123';

  backupRepository.save(buildSeedSnapshot('BKP-SEED-1', 'Sauvegarde protégée', true, new Date().toISOString()));
  backupRepository.save(
    buildSeedSnapshot('BKP-SEED-2', 'Sauvegarde standard', false, new Date(Date.now() - 3600_000).toISOString())
  );

  // 1. Repository CRUD & Seed Data
  console.log('--- 1. Backup Repository & Seeding ---');
  const demoBackups = backupRepository.getAll('123456789012345678');
  assert(demoBackups.length >= 2, 'Initial demo backups are seeded (>= 2)');
  assert(demoBackups.some((b) => b.isProtected), 'Protected demo backup is present');

  const kpis = backupRepository.getKpis('123456789012345678');
  assert(kpis.totalBackups >= 2, 'KPIs totalBackups computed correctly');
  assert(kpis.protectedCount >= 1, 'KPIs protectedCount computed correctly');
  assert(kpis.verifiedCount >= 2, 'KPIs verifiedCount computed with valid checksums');

  // 2. Cryptographic Integrity & Tamper Detection
  console.log('\n--- 2. Cryptographic Integrity (SHA-256) ---');
  const sampleBkp = demoBackups[0];
  const integrityInitial = BackupIntegrityService.verifySnapshot(sampleBkp);
  assert(integrityInitial.valid, 'Original snapshot passes SHA-256 verification');

  // Simuler altération
  const tamperedBkp: BackupSnapshot = JSON.parse(JSON.stringify(sampleBkp));
  tamperedBkp.data.roles[0].name = 'Hacked Admin Role';
  const integrityTampered = BackupIntegrityService.verifySnapshot(tamperedBkp);
  assert(!integrityTampered.valid, 'Tampered snapshot is properly rejected with invalid checksum');

  // 3. ETHONE Config Extraction
  console.log('\n--- 3. ETHONE Config Extraction ---');
  const ethoneConfigs = BackupCollectorService.collectEthoneConfigs('123456789012345678');
  assert(typeof ethoneConfigs === 'object', 'ETHONE module configurations collected as object');

  // 4. Diff Engine (Snapshot A vs Snapshot B)
  console.log('\n--- 4. Diff Engine (Comparison) ---');
  const bkpA = demoBackups[0];
  const bkpB: BackupSnapshot = JSON.parse(JSON.stringify(bkpA));
  bkpB.backupId = 'BKP-DIFF-TEST';
  bkpB.name = 'Diff Target';

  // Modifier bkpB: ajouter un rôle, modifier un salon, supprimer une catégorie
  bkpB.data.roles.push({
    id: 'role-new',
    name: 'Nouveau Grade Test',
    color: 0x00ff00,
    hoist: true,
    position: 7,
    permissions: '0',
    mentionable: true,
    managed: false,
  });
  bkpB.data.channels[0].topic = 'Nouveau sujet modifié !';
  bkpB.data.categories = bkpB.data.categories.slice(1); // Retire la première catégorie

  const diffResult = BackupDiffService.compare(bkpA, bkpB);
  assert(diffResult.summary.added >= 1, 'Diff correctly detected ADDED role');
  assert(diffResult.summary.modified >= 1, 'Diff correctly detected MODIFIED channel');
  assert(diffResult.summary.removed >= 1, 'Diff correctly detected REMOVED category');
  assert(diffResult.roles.some((r) => r.status === 'ADDED' && r.name === 'Nouveau Grade Test'), 'Added role accurately matched');

  // 5. Restore Preview Plan
  console.log('\n--- 5. Restore Preview Planning ---');
  const mockClient: any = {
    guilds: {
      cache: new Map([
        [
          testGuildId,
          {
            id: testGuildId,
            name: 'Test Server',
            roles: {
              fetch: async () =>
                new Map([
                  ['role-everyone', { id: testGuildId, name: '@everyone', position: 0, managed: false }],
                  ['role-admin', { id: 'role-admin', name: 'Administrateur', position: 10, managed: false }],
                ]),
            },
            channels: {
              fetch: async () =>
                new Map([
                  ['chan-rules', { id: 'c1', name: 'reglement', type: 0, position: 0 }],
                ]),
            },
          },
        ],
      ]),
    },
  };

  const previewPlanSafe = await BackupRestoreService.generatePreviewPlan({
    client: mockClient,
    guildId: testGuildId,
    backup: bkpA,
    safetyLevel: 'SAFE',
    mode: 'FULL',
  });

  assert(previewPlanSafe.counts.willCreate > 0, 'Safe restore plans to create missing objects');
  assert(previewPlanSafe.counts.willDelete === 0, 'Safe restore NEVER deletes existing objects');
  assert(previewPlanSafe.counts.willSkip > 0, 'Safe restore skips system and @everyone roles');

  const previewPlanDestructive = await BackupRestoreService.generatePreviewPlan({
    client: mockClient,
    guildId: testGuildId,
    backup: bkpA,
    safetyLevel: 'DESTRUCTIVE',
    mode: 'FULL',
  });
  assert(previewPlanDestructive.safetyLevel === 'DESTRUCTIVE', 'Destructive restore plan created');

  // 6. Retention Policy & Protected Backups Enforcement
  console.log('\n--- 6. Retention Policy & Protected Snapshots ---');
  // Créer un backup non protégé et un backup protégé
  const protectedBkp: BackupSnapshot = {
    ...bkpA,
    backupId: 'BKP-RETENTION-PROT',
    guildId: testGuildId,
    isProtected: true,
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 jours
  };
  const expiredBkp: BackupSnapshot = {
    ...bkpA,
    backupId: 'BKP-RETENTION-EXP',
    guildId: testGuildId,
    isProtected: false,
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 jours
  };

  backupRepository.save(protectedBkp);
  backupRepository.save(expiredBkp);

  const prunedCount = backupRepository.pruneExpired(testGuildId);
  assert(prunedCount >= 1, 'Expired unprotected backup was purged');

  const shouldRemainProtected = backupRepository.getById(testGuildId, 'BKP-RETENTION-PROT');
  assert(shouldRemainProtected !== null, 'Protected backup was PRESERVED despite age > 100 days');

  // Tenter de supprimer directement un backup protégé doit échouer
  try {
    backupRepository.delete(testGuildId, 'BKP-RETENTION-PROT');
    assert(false, 'Should have thrown when deleting protected backup');
  } catch {
    assert(true, 'Deletion of protected backup is strictly blocked by repository');
  }

  // 7. Unprotect & Safe Deletion
  console.log('\n--- 7. Unprotect & Safe Deletion ---');
  const unprotectOk = backupRepository.toggleProtection(testGuildId, 'BKP-RETENTION-PROT', false);
  assert(unprotectOk, 'Protection successfully removed');

  const deleteOk = backupRepository.delete(testGuildId, 'BKP-RETENTION-PROT');
  assert(deleteOk, 'Unprotected backup successfully deleted');

  // 8. Test Backup (Dry-run Validation)
  console.log('\n--- 8. Test Backup (Dry-run Validator) ---');
  const { backupService } = await import('./src/modules/backup/services/backupService.js');
  const testVal = backupService.testBackup('123456789012345678', demoBackups[0].backupId);
  assert(testVal.valid, 'testBackup returns valid = true for intact snapshot');
  assert(testVal.readiness === 'READY', 'testBackup returns readiness = READY');

  // 9. Cleanup — leave the local data/discord_backups.json exactly as this
  // run found it, so the suite stays idempotent across repeated runs and
  // never accumulates duplicate seed fixtures.
  backupRepository.toggleProtection(SEED_GUILD_ID, 'BKP-SEED-1', false);
  backupRepository.delete(SEED_GUILD_ID, 'BKP-SEED-1');
  backupRepository.delete(SEED_GUILD_ID, 'BKP-SEED-2');

  console.log(`\n=== RESULTS: ${passed}/${total} tests passed (${((passed / total) * 100).toFixed(1)}%) ===\n`);
}

runTests().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
