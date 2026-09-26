/** Compteurs de salons : « (inactif) » à la coupure du module, valeur réelle à la réactivation. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-ss-toggle-')));
const { serverStatsStorage } = await import('../src/modules/serverStats/storage/serverStatsStorage.js');
const { serverStatsService } = await import('../src/modules/serverStats/services/serverStatsService.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = '100000000000000041';
const channel: any = { id: 'c1', name: 'Compteur test', type: 2, setName: async (n: string) => { channel.name = n; } };
const guild: any = {
  id: G,
  members: { fetch: async () => {}, cache: new Map(), me: null },
  memberCount: 5,
  roles: { cache: new Map(), everyone: { id: G } },
  channels: { fetch: async (id: string) => (id === 'c1' ? channel : null), cache: new Map([['c1', channel]]) },
};
const client: any = { guilds: { cache: new Map([[G, guild]]) }, isReady: () => true };
serverStatsService.initialize(client);
serverStatsService.destroy();

serverStatsStorage.upsert({ guildId: G, channelId: 'c1', type: 'custom', template: 'Compteur test', roleId: null, lastValue: null, lastName: 'Compteur test' } as any);
serverStatsStorage.updateConfig(G, { enabled: true });

await serverStatsService.onToggle(G, false);
ok(channel.name === 'Compteur test (inactif)', 'coupure : le salon affiche « (inactif) »');
ok(serverStatsStorage.getGuild(G)[0].lastName === 'Compteur test (inactif)', 'le nom inactif est mémorisé');

await serverStatsService.onToggle(G, false);
ok(channel.name === 'Compteur test (inactif)', 'coupure répétée : pas de double mention');

await serverStatsService.onToggle(G, true);
ok(channel.name === 'Compteur test', 'réactivation : le salon reprend sa valeur réelle');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
