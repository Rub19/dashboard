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

  console.log('\n🧪 1b. Validation des réglages:');
  let rejected = false;
  try {
    musicPersistence.updateSettings(gid, { djMode: 'oui' } as never);
  } catch {
    rejected = true;
  }
  assert(rejected, 'une valeur du mauvais type (djMode: "oui") est refusée');
  assert(musicPersistence.getSettings(gid).djMode === false, 'et les réglages restent inchangés');
  musicPersistence.updateSettings(gid, { defaultVolume: 40, inconnu: 'x' } as never);
  const after = musicPersistence.getSettings(gid) as unknown as Record<string, unknown>;
  assert(after.defaultVolume === 40, 'une valeur valide est enregistrée');
  assert(!('inconnu' in after), 'une clé inconnue est ignorée');
  let outOfRange = false;
  try {
    musicPersistence.updateSettings(gid, { defaultVolume: 900 });
  } catch {
    outOfRange = true;
  }
  assert(outOfRange, 'un volume hors bornes (900) est refusé');

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

  console.log('\n⚡ 4. Retour automatique (exclusion / déplacement):');
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  (voiceStayService as unknown as { client: unknown }).client = { user: { id: 'bot-1' }, isReady: () => true, guilds: { cache: new Map() } };
  const stateFor = (guild: unknown, channelId: string | null) => ({ id: 'bot-1', guild, channelId }) as never;

  // mémorisation automatique du salon quand le bot arrive quelque part
  const gAuto = 'guild-auto-stay-0001';
  assert(voiceStayService.getStayChannelId(gAuto) === null, 'aucun salon mémorisé au départ');
  voiceStayService.remember(gAuto, 'c-first');
  assert(voiceStayService.getStayChannelId(gAuto) === 'c-first', 'le salon où le bot arrive est mémorisé automatiquement');
  voiceStayService.remember(gAuto, 'c-other');
  assert(voiceStayService.getStayChannelId(gAuto) === 'c-first', 'un salon déjà mémorisé n\'est pas écrasé (déplacement = /join)');

  // exclu du vocal → il revient
  connectCalls = 0;
  connectResult = true;
  const kicked = fakeGuild({ id: 'g-kick', botChannelId: null, channelId: 'c-kick' });
  musicPersistence.updateSettings('g-kick', { stayChannelId: 'c-kick' });
  voiceStayService.onVoiceStateUpdate(stateFor(kicked.guild, 'c-kick'), stateFor(kicked.guild, null));
  assert(connectCalls === 0, 'pas de reconnexion instantanée (petit délai anti-rebond)');
  await wait(1900);
  assert(connectCalls === 1, 'exclu du vocal → le bot revient en moins de 2 secondes');

  // déplacé (par un modérateur ou vers le salon AFK) → il revient dans son salon
  connectCalls = 0;
  const moved = fakeGuild({ id: 'g-move', botChannelId: 'c-afk', channelId: 'c-home' });
  musicPersistence.updateSettings('g-move', { stayChannelId: 'c-home' });
  voiceStayService.onVoiceStateUpdate(stateFor(moved.guild, 'c-home'), stateFor(moved.guild, 'c-afk'));
  await wait(1900);
  assert(connectCalls === 1, 'déplacé ailleurs → le bot retourne dans son salon');

  // arrivée normale dans son salon : rien à faire
  connectCalls = 0;
  const same = fakeGuild({ id: 'g-same', botChannelId: 'c-same', channelId: 'c-same' });
  musicPersistence.updateSettings('g-same', { stayChannelId: 'c-same' });
  voiceStayService.onVoiceStateUpdate(stateFor(same.guild, null), stateFor(same.guild, 'c-same'));
  await wait(1900);
  assert(connectCalls === 0, 'le bot est dans son salon → aucune reconnexion');

  // /disconnect : plus de salon mémorisé → il ne revient pas
  connectCalls = 0;
  const left = fakeGuild({ id: 'g-left', botChannelId: null, channelId: 'c-left' });
  musicPersistence.updateSettings('g-left', { stayChannelId: null });
  voiceStayService.onVoiceStateUpdate(stateFor(left.guild, 'c-left'), stateFor(left.guild, null));
  await wait(1900);
  assert(connectCalls === 0, 'après /disconnect (salon retiré) → le bot ne revient pas');

  // un événement concernant un autre membre est ignoré
  connectCalls = 0;
  voiceStayService.onVoiceStateUpdate(stateFor(kicked.guild, 'c-kick'), { id: 'someone-else', guild: kicked.guild, channelId: null } as never);
  await wait(1900);
  assert(connectCalls === 0, 'le départ d\'un autre membre ne déclenche rien');

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
