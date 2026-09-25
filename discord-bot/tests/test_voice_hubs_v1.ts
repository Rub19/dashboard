/** Hubs de salons vocaux temporaires : validation, installation en un clic, pas de doublon. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ChannelType, Collection, PermissionFlagsBits } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-voicehubs-test-')));
const svc = await import('../src/modules/voice/services/voiceHubService.js');
const { voiceRepository } = await import('../src/modules/voice/storage/voiceRepository.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = '100000000000000001';
let seq = 200000000000000000n;
const channels = new Collection<string, any>();
const addChannel = (c: any) => {
  const id = String(++seq);
  const ch = { id, parentId: null, ...c };
  channels.set(id, ch);
  return ch;
};
const text = addChannel({ type: ChannelType.GuildText, name: 'général' });
const vocal = addChannel({ type: ChannelType.GuildVoice, name: 'Salon 1' });
const created: string[] = [];
let canManage = false;
const guild: any = {
  id: G,
  roles: { everyone: { id: G } },
  channels: {
    cache: channels,
    create: async (o: any) => {
      created.push(o.name);
      return addChannel({ type: o.type, name: o.name, parentId: o.parent ?? null });
    },
  },
  members: { me: { permissions: { has: (p: bigint) => canManage && p === PermissionFlagsBits.ManageChannels } } },
};

console.log('\nValidation du salon déclencheur');
ok(svc.CreateHubSchema.safeParse({ name: 'x' }).success === false, 'un hub sans salon déclencheur est refusé (plus de faux « channel_trigger »)');
ok(svc.CreateHubSchema.safeParse({ channelId: vocal.id, isAdmin: true }).success === false, 'champs inconnus refusés');
ok(!!svc.createHub(guild, { channelId: '999999999999999999' }).error, 'salon inexistant sur ce serveur refusé');
ok(!!svc.createHub(guild, { channelId: text.id }).error, 'un salon textuel ne peut pas être déclencheur');
const first = svc.createHub(guild, { channelId: vocal.id, name: 'Jeux', userLimit: 5 });
ok(!!first.hub && first.hub.userLimit === 5 && first.hub.namingTemplate.includes('{username}') && first.hub.enabled, 'hub créé avec des valeurs par défaut sensées');
ok(voiceRepository.getHubs(G).length === 1, 'hub enregistré');
ok(!!svc.createHub(guild, { channelId: vocal.id }).error, 'le même salon ne peut pas servir à deux hubs');

console.log('\nModification');
const upd = svc.updateHub(guild, first.hub!.id, { name: 'Jeux 2', userLimit: 8 });
ok(upd.hub?.name === 'Jeux 2' && upd.hub.userLimit === 8 && upd.hub.guildId === G, 'champs autorisés modifiés');
ok(svc.UpdateHubSchema.safeParse({ guildId: 'autre' }).success === false && svc.UpdateHubSchema.safeParse({ createdAt: 'x' }).success === false, 'guildId / createdAt non modifiables');
ok(svc.UpdateHubSchema.safeParse({ userLimit: 500 }).success === false && svc.UpdateHubSchema.safeParse({ bitrate: 5 }).success === false, 'limites de membres et de débit bornées');
ok(svc.updateHub(guild, 'inconnu', { name: 'x' }).notFound === true, 'hub inconnu → introuvable');
const other = { ...guild, id: 'autre-serveur' };
ok(svc.updateHub(other, first.hub!.id, { name: 'vol' }).notFound === true, 'un hub d’un autre serveur n’est pas modifiable');

console.log('\nInstallation en un clic');
voiceRepository.deleteHub(G, first.hub!.id);
let refused = '';
try {
  await svc.quickSetup(guild);
} catch (e: any) {
  refused = e.message;
}
ok(/Gérer les salons/.test(refused) && created.length === 0, 'sans la permission « Gérer les salons » : message clair, rien créé');
canManage = true;
const q = await svc.quickSetup(guild);
ok(q.created && created.length === 2 && created[0] === svc.QUICK_CATEGORY_NAME && created[1] === svc.QUICK_TRIGGER_NAME, 'catégorie + salon déclencheur créés');
ok(channels.get(q.channelId)?.parentId === q.categoryId && q.hub.channelId === q.channelId && q.hub.categoryId === q.categoryId, 'le déclencheur est dans la catégorie et relié au hub');
ok(voiceRepository.getSettings(G).enabled === true, 'le module est activé');
const again = await svc.quickSetup(guild);
ok(!again.created && created.length === 2 && voiceRepository.getHubs(G).length === 1, 'relancer ne crée aucun doublon');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
