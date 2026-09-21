import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Les dépôts écrivent dans <cwd>/data : dossier temporaire, modules importés après le chdir.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-onboarding-'));
process.chdir(tmpDir);
const { OnboardingRunner, isOnboardingId } = await import('./src/modules/welcome/services/onboardingRunner.js');
const { OnboardingFlowSchema, OnboardingStepSchema } = await import('./src/modules/welcome/types/onboarding.js');

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

const guildId = '1128633164290596884';
const userId = '825124006209388616';

/** Faux membre : juste ce que le moteur lit. */
function fakeMember(roleIds: string[] = []) {
  const guild = {
    id: guildId,
    name: 'ETHONE Test',
    memberCount: 1245,
    ownerId: 'owner',
    iconURL: () => null,
    members: { cache: new Map() },
    roles: { cache: new Map() },
  };
  return {
    id: userId,
    displayName: 'Rub',
    guild,
    user: { username: 'rub19', tag: 'rub19', createdAt: new Date('2024-01-01'), displayAvatarURL: () => 'https://example.test/a.png' },
    roles: { cache: new Map(roleIds.map((r) => [r, {}])) },
  } as never;
}

function idsOf(msg: { components: Array<{ toJSON: () => { components: Array<{ custom_id?: string; label?: string; options?: unknown[]; max_values?: number }> } }> }) {
  return msg.components.flatMap((row) => row.toJSON().components);
}

async function run() {
  console.log('🧪 Moteur d\'Onboarding\n');

  const flow = OnboardingFlowSchema.parse({
    guildId,
    enabled: true,
    steps: [
      { id: 's-welcome', type: 'WELCOME', order: 0, title: '👋 Bienvenue {username} !', description: 'Salut {user} sur {server}' },
      { id: 's-rules', type: 'RULES', order: 1, title: 'Règlement', description: 'Lis bien', rulesList: ['1. Respect', '2. Pas de spam'] },
      {
        id: 's-roles',
        type: 'ROLE_SELECTION',
        order: 2,
        title: 'Tes rôles',
        description: 'Choisis',
        maxRoleSelections: 2,
        required: true,
        roleChoices: [
          { roleId: '111111111', label: 'Gamer', emoji: '🎮', description: 'Jeux' },
          { roleId: '222222222', label: 'Dev', emoji: null, description: null },
          { roleId: '333333333', label: 'Artiste', emoji: null, description: null },
        ],
      },
      { id: 's-q-req', type: 'QUESTION', order: 3, title: 'Question', description: 'Dis-nous', questionText: 'Comment nous as-tu trouvés ?', required: true },
      { id: 's-q-opt', type: 'QUESTION', order: 4, title: 'Question 2', description: 'Facultative', questionText: 'Ton jeu préféré ?', required: false },
      { id: 's-verif', type: 'VERIFICATION', order: 5, title: 'Vérification', description: 'Valide' },
      { id: 's-end', type: 'COMPLETION', order: 6, title: 'Fini', description: 'Bravo' },
    ].map((s) => OnboardingStepSchema.parse(s)),
  });

  const member = fakeMember(['222222222']);

  console.log('▶️ 1. Étapes:');
  let msg = await OnboardingRunner.buildStep(flow, 1, member);
  let comps = idsOf(msg as never);
  const rulesEmbed = msg.embeds[0].toJSON();
  assert((rulesEmbed.description || '').includes('Respect') && (rulesEmbed.description || '').includes('Pas de spam'), 'le règlement affiche chaque règle');
  assert(comps.length === 1 && /accepte/i.test(comps[0].label || ''), 'étape règlement : bouton « J\'accepte »');
  assert(rulesEmbed.footer?.text.startsWith('Étape 2/7'), 'la progression est indiquée (Étape 2/7)');

  msg = await OnboardingRunner.buildStep(flow, 2, member);
  comps = idsOf(msg as never);
  const select = comps.find((c) => Array.isArray(c.options));
  assert(!!select && (select.options?.length ?? 0) === 3, 'choix de rôles : un menu avec les 3 rôles');
  assert(select?.max_values === 2, 'le maximum de rôles choisis est respecté (2)');
  const opts = (select?.options ?? []) as Array<{ value: string; default?: boolean }>;
  assert(opts.find((o) => o.value === '222222222')?.default === true, 'un rôle déjà possédé est pré-sélectionné');

  msg = await OnboardingRunner.buildStep(flow, 3, member);
  comps = idsOf(msg as never);
  assert(comps.length === 1 && /Répondre/.test(comps[0].label || ''), 'question obligatoire : seulement « Répondre » (pas de « Passer »)');
  msg = await OnboardingRunner.buildStep(flow, 4, member);
  comps = idsOf(msg as never);
  assert(comps.length === 2, 'question facultative : « Répondre » et « Passer »');

  msg = await OnboardingRunner.buildStep(flow, 5, member);
  comps = idsOf(msg as never);
  assert(/Valider/.test(comps[0].label || ''), 'étape vérification : bouton « Valider mon entrée »');

  msg = await OnboardingRunner.buildStep(flow, 6, member);
  comps = idsOf(msg as never);
  assert(/^onb:done:/.test(comps[0].custom_id || ''), 'dernière étape : bouton « Terminer » (action done)');

  console.log('\n🔑 2. Boutons:');
  const all = [1, 2, 3, 4, 5, 6].flatMap((i) => [i]);
  let allOk = true;
  let lengthOk = true;
  for (const i of all) {
    const m = await OnboardingRunner.buildStep(flow, i, member);
    for (const c of idsOf(m as never)) {
      if (!c.custom_id || !isOnboardingId(c.custom_id)) allOk = false;
      if ((c.custom_id || '').length > 100) lengthOk = false;
      if (c.custom_id && !c.custom_id.includes(userId)) allOk = false;
    }
  }
  assert(allOk, 'chaque bouton porte le préfixe onb: et l\'identifiant du membre (seul lui peut l\'utiliser)');
  assert(lengthOk, 'aucun identifiant ne dépasse 100 caractères (limite Discord)');
  assert(!isOnboardingId('welcome_verify:1') && !isOnboardingId('music_play'), 'les autres boutons du bot ne sont pas captés');

  console.log('\n📝 3. Variables:');
  msg = await OnboardingRunner.buildStep(flow, 0, member);
  const first = msg.embeds[0].toJSON();
  assert((first.title || '').includes('rub19') && !(first.title || '').includes('{username}'), 'les variables du titre sont remplacées');
  assert((first.description || '').includes('ETHONE Test'), '{server} est remplacé dans la description');

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
