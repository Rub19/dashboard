import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Le dépôt écrit dans <cwd>/data : dossier temporaire, module importé après le chdir.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-welcome-analytics-'));
process.chdir(tmpDir);
const { welcomeRepository } = await import('./src/modules/welcome/storage/welcomeRepository.js');

let passed = 0;
let failed = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

const A = 'guild-A-0000000000001';
const B = 'guild-B-0000000000002';
const ev = (guildId: string, type: string, userId: string) =>
  welcomeRepository.recordEvent({ guildId, type: type as never, userId, userTag: `${userId}#0`, detail: 'test' });

async function run() {
  console.log('🧪 Statistiques d\'accueil par serveur\n');

  console.log('📭 1. Serveur sans activité:');
  let ov = welcomeRepository.getOverview(A);
  assert(ov.newMembersToday === 0 && ov.verificationsToday === 0 && ov.onboardingCompletedToday === 0, 'aucune arrivée → tous les compteurs à 0');
  assert(ov.funnel.every((s) => s.count === 0 && s.percentage === 0), 'l\'entonnoir est à 0 % (plus de planchers inventés à 92 / 84 / 78 / 73 %)');
  assert(ov.verificationRate === '—' && ov.onboardingCompletionRate === '—' && ov.dmDeliveryRate === '—', 'les taux sans données valent « — » (plus de 78 % / 73 % / 96 % par défaut)');
  assert(ov.rolesDistributedToday === 0 && ov.recentEvents.length === 0, 'aucun rôle ni activité récente inventés');

  console.log('\n🏠 2. Séparation des serveurs:');
  ev(A, 'MEMBER_JOIN', 'u1');
  ev(A, 'MEMBER_JOIN', 'u2');
  ev(B, 'MEMBER_JOIN', 'u3');
  ev(B, 'MEMBER_LEAVE', 'u9');
  ev(A, 'ONBOARDING_START', 'u1');
  ev(A, 'RULES_ACCEPTED', 'u1');
  ev(A, 'ROLE_ASSIGNED', 'u1');
  ev(A, 'ROLE_ASSIGNED', 'u1');
  ev(A, 'ONBOARDING_COMPLETE', 'u1');
  ov = welcomeRepository.getOverview(A);
  assert(ov.newMembersToday === 2, 'le serveur A compte ses 2 arrivées (pas celle du serveur B)');
  assert(ov.recentEvents.every((e) => e.guildId === A), 'l\'activité récente ne montre que le serveur choisi');
  const ovB = welcomeRepository.getOverview(B);
  assert(ovB.newMembersToday === 1 && ovB.recentEvents.every((e) => e.guildId === B), 'le serveur B ne voit que le sien');

  console.log('\n📊 3. Chiffres réels:');
  assert(ov.funnel[1].count === 1 && ov.funnel[1].percentage === 50, 'début d\'onboarding : 1 membre sur 2 = 50 %');
  assert(ov.funnel[2].count === 1 && ov.funnel[3].count === 0 && ov.funnel[3].percentage === 0, 'règles acceptées = 1, vérifiés = 0 (pas de plancher)');
  assert(ov.onboardingCompletedToday === 1 && ov.onboardingCompletionRate === '100%', 'un parcours commencé et terminé = 100 % de complétion');
  assert(ov.verificationRate === '0%', 'aucune vérification pour 2 arrivées = 0 %');
  assert(ov.rolesDistributedToday === 2, 'les rôles distribués sont comptés tels quels (2), pas multipliés par 2,3');
  ev(A, 'RULES_ACCEPTED', 'u1');
  assert(welcomeRepository.getOverview(A).funnel[2].count === 1, 'un membre qui accepte deux fois ne compte qu\'une fois');
  ev(A, 'DM_SENT', 'u1');
  ev(A, 'DM_FAILED', 'u2');
  assert(welcomeRepository.getOverview(A).dmDeliveryRate === '50%', 'taux de messages privés réel (1 envoyé sur 2 = 50 %)');

  console.log('\n==================================================');
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log('==================================================');
  process.chdir(os.tmpdir());
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
