import { syncEngine } from './src/services/syncEngine.js';
import { notifyDiscordState, guildIdOfEvent, LIVE_DISCORD_EVENTS } from './src/services/discordStateNotifier.js';

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

/** Faux flux SSE : mémorise ce qui lui est envoyé. */
function fakeResponse(): { res: any; written: string[] } {
  const written: string[] = [];
  const res: any = {
    writeHead: () => res,
    write: (chunk: string) => (written.push(String(chunk)), true),
    on: () => res,
    end: () => undefined,
    flushHeaders: () => undefined,
    setHeader: () => undefined,
  };
  return { res, written };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const discordEvents = (w: string[]) => w.filter((c) => c.startsWith('event: DISCORD_EVENT')).length;

async function run() {
  console.log('🧪 Synchronisation Discord → dashboard\n');

  console.log('🗺️ 1. Correspondance des événements:');
  assert(LIVE_DISCORD_EVENTS.roleCreate === 'roles' && LIVE_DISCORD_EVENTS.channelUpdate === 'channels', 'rôles et salons sont suivis');
  assert(LIVE_DISCORD_EVENTS.guildMemberAdd === 'members' && LIVE_DISCORD_EVENTS.guildUpdate === 'guild', 'membres et serveur sont suivis');
  assert(guildIdOfEvent('roleUpdate', { guild: { id: 'G1' } }) === 'G1', 'serveur d\'un rôle');
  assert(guildIdOfEvent('channelCreate', { guildId: 'G2' }) === 'G2', 'serveur d\'un salon');
  assert(guildIdOfEvent('guildUpdate', { id: 'G3' }) === 'G3', 'serveur d\'une mise à jour de serveur');
  assert(guildIdOfEvent('roleCreate', undefined) === undefined, 'pas de plantage sans argument');

  console.log('\n📡 2. Diffusion, regroupement et isolation:');
  const A = fakeResponse();
  const B = fakeResponse();
  syncEngine.registerClient('client-A', A.res, 'GUILD-A', 'user-a');
  syncEngine.registerClient('client-B', B.res, 'GUILD-B', 'user-b');

  notifyDiscordState('GUILD-A', 'roles', 'roleCreate');
  notifyDiscordState('GUILD-A', 'roles', 'roleUpdate');
  notifyDiscordState('GUILD-A', 'roles', 'roleUpdate');
  assert(discordEvents(A.written) === 0, 'rien n\'est envoyé tant que la rafale n\'est pas terminée');
  await sleep(700);
  assert(discordEvents(A.written) === 1, '3 changements de rôles rapprochés = 1 seul événement');
  assert(A.written.join('').includes('"kind":"roles"'), 'l\'événement indique la famille de données touchée');
  assert(discordEvents(B.written) === 0, 'un autre serveur ne reçoit rien (isolation stricte)');

  notifyDiscordState('GUILD-A', 'channels', 'channelCreate');
  await sleep(700);
  assert(discordEvents(A.written) === 2, 'une autre famille (salons) produit son propre événement');

  console.log('\n==================================================');
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log('==================================================');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
