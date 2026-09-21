import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionFlagsBits } from 'discord.js';

// musicPersistence écrit dans <cwd>/data : on travaille dans un dossier temporaire pour ne rien
// laisser dans les vraies données du bot. Les modules sont donc importés APRÈS le chdir.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-voice-stay-'));
process.chdir(tmpDir);
const { voiceStayService } = await import('./src/modules/music/services/voiceStayService.js');
const { musicPersistence, DEFAULT_MUSIC_SETTINGS } = await import('./src/modules/music/storage/musicPersistence.js');
const { MusicSettingsSchema } = await import('./src/modules/music/types/music.js');

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

/** Faux serveur Discord : juste ce que voiceStayService lit. */
function fakeGuild(opts: { id: string; botChannelId: string | null; channelId: string; canConnect?: boolean; canSpeak?: boolean }) {
  const channel = {
    id: opts.channelId,
    name: 'Salon test',
    isVoiceBased: () => true,
    permissionsFor: () => ({
      has: (flag: bigint) =>
        flag === PermissionFlagsBits.Connect ? opts.canConnect !== false : flag === PermissionFlagsBits.Speak ? opts.canSpeak !== false : true,
    }),
  };
  const guild = {
    id: opts.id,
    members: { me: { voice: { channelId: opts.botChannelId } } },
    channels: { cache: new Map([[opts.channelId, channel]]) },
  };
  return { guild: guild as never, channel };
}

async function runTests() {
  console.log('🧪 Voice stay (mode 24h/24) tests\n');

  console.log('⚙️ 1. Réglage stayChannelId:');
  assert(DEFAULT_MUSIC_SETTINGS.stayChannelId === null, 'désactivé par défaut');
  assert(MusicSettingsSchema.parse({}).stayChannelId === null, 'le schéma le valorise à null par défaut');
  assert(MusicSettingsSchema.parse({ stayChannelId: '123' }).stayChannelId === '123', 'le schéma accepte un identifiant de salon');
  const gid = 'guild-voice-stay-test-000001';
  musicPersistence.updateSettings(gid, { stayChannelId: 'chan-1' });
  assert(voiceStayService.getStayChannelId(gid) === 'chan-1', 'le salon est mémorisé');
  musicPersistence.updateSettings(gid, { stayChannelId: null });
  assert(voiceStayService.getStayChannelId(gid) === null, 'et retiré par /disconnect');

  console.log('\n🔌 2. Reconnexion:');
  let connectCalls = 0;
  let connectResult = true;
  const getPlayer = () =>
    ({
      connect: async () => {
        connectCalls++;
        return connectResult;
      },
    }) as never;
  // Le service n'utilise le client/getPlayer que via start() ; on les fournit sans lancer l'intervalle.
  (voiceStayService as unknown as { getPlayer: unknown }).getPlayer = getPlayer;

  const out = fakeGuild({ id: 'g-out', botChannelId: null, channelId: 'c-out' });
  const okOut = await voiceStayService.ensure(out.guild, 'c-out');
  assert(okOut === true && connectCalls === 1, 'bot hors du salon → il est reconnecté (1 appel)');
  assert(voiceStayService.getJoinedAt('g-out') !== null, "l'heure d'arrivée est enregistrée");

  connectCalls = 0;
  const inside = fakeGuild({ id: 'g-in', botChannelId: 'c-in', channelId: 'c-in' });
  const okIn = await voiceStayService.ensure(inside.guild, 'c-in');
  assert(okIn === true && connectCalls === 0, 'bot déjà dans le salon → aucune reconnexion');
  assert(voiceStayService.getJoinedAt('g-in') !== null, "l'heure d'arrivée est posée pour un bot déjà présent");

  console.log('\n🛡️ 3. Cas limites:');
  connectCalls = 0;
  const noPerm = fakeGuild({ id: 'g-perm', botChannelId: null, channelId: 'c-perm', canConnect: false });
  const okPerm = await voiceStayService.ensure(noPerm.guild, 'c-perm');
  assert(okPerm === false && connectCalls === 0, 'permission Connexion manquante → pas de tentative');

  const gone = fakeGuild({ id: 'g-gone', botChannelId: null, channelId: 'c-here' });
  const okGone = await voiceStayService.ensure(gone.guild, 'c-supprime');
  assert(okGone === false && connectCalls === 0, 'salon supprimé → pas de tentative, pas de plantage');

  connectCalls = 0;
  connectResult = false;
  const failing = fakeGuild({ id: 'g-fail', botChannelId: null, channelId: 'c-fail' });
  const first = await voiceStayService.ensure(failing.guild, 'c-fail');
  const second = await voiceStayService.ensure(failing.guild, 'c-fail');
  assert(first === false && second === false, 'échec de connexion → renvoie false');
  assert(connectCalls === 1, "après un échec, l'essai suivant est espacé (pas de rafale de tentatives)");

  connectResult = true;
  voiceStayService.markLeft('g-fail');
  const retried = await voiceStayService.ensure(failing.guild, 'c-fail');
  assert(retried === true, "après /disconnect puis /join (markLeft), le délai d'attente est levé");

  voiceStayService.markLeft('g-out');
  assert(voiceStayService.getJoinedAt('g-out') === null, 'markLeft efface l\'heure d\'arrivée');

  console.log('\n==================================================');
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log('==================================================');
  process.chdir(os.tmpdir());
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
