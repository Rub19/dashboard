/** Contacts d'urgence : détection des problèmes sérieux, destinataires, alerte sans doublon. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ChannelType, Collection, PermissionFlagsBits as P } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-emergency-test-')));
const svc = await import('../src/modules/health/services/emergencyService.js');
const { guildConfigService } = await import('../src/services/guildConfigService.js');
const { reportsStorage } = await import('../src/modules/reports/storage/reportsStorage.js');
const { secureRolesStorage } = await import('../src/modules/secureroles/storage/secureRolesStorage.js');
const { logStorage } = await import('../src/modules/logs/storage/logStorage.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = '100000000000000031';
const sentChannel: any[] = [];
const dms: Record<string, any[]> = {};
let botPerms = new Set<bigint>([P.ViewChannel, P.SendMessages, P.EmbedLinks]);
const mkMember = (id: string, admin = false, bot = false): any => ({ id, user: { id, bot }, permissions: { has: (p: bigint) => admin || (p === P.Administrator ? false : false) } });
const sys: any = {
  id: 'sys', type: ChannelType.GuildText, permissionsFor: () => ({ has: () => true }),
  send: async (p: any) => { sentChannel.push(p); },
};
const members = new Collection<string, any>([['owner', mkMember('owner', true)], ['adm', mkMember('adm', true)], ['user', mkMember('user')], ['bot', mkMember('bot', true, true)]]);
const guild: any = {
  id: G, name: 'Serveur test', ownerId: 'owner', systemChannelId: 'sys',
  channels: { cache: new Collection<string, any>([['sys', sys]]) },
  roles: { cache: new Collection<string, any>() },
  members: { me: { permissions: { has: (p: bigint) => botPerms.has(p) } }, cache: members, fetch: async () => members },
  client: { users: { fetch: async (id: string) => ({ send: async (p: any) => { (dms[id] ??= []).push(p); } }) } },
};
const client: any = { guilds: { cache: new Collection([[G, guild]]) } };

console.log('\nDétection');
ok(svc.collectIssues(guild).length === 0, 'serveur sain : aucun problème');
botPerms = new Set([P.ViewChannel]);
const base = svc.collectIssues(guild);
ok(base.length === 2 && base.every((i) => i.title === 'Permissions de base'), 'permissions de base manquantes détectées');
botPerms = new Set([P.ViewChannel, P.SendMessages, P.EmbedLinks]);

reportsStorage.updateConfig(G, { enabled: true, channelId: 'disparu' });
ok(svc.collectIssues(guild).some((i) => i.id === 'reports:channel'), 'salon des signalements supprimé détecté');
reportsStorage.updateConfig(G, { enabled: false });
ok(svc.collectIssues(guild).length === 0, 'module désactivé : plus de problème signalé');

secureRolesStorage.updateConfig(G, { enabled: true, roles: [{ roleId: '111111', permissionsRoleId: '222222', originalPermissions: '4', securedPermissions: '4', securedAt: new Date().toISOString(), securedBy: null }] });
const secure = svc.collectIssues(guild);
ok(secure.some((i) => i.id === 'secure:roles') && secure.some((i) => i.id === 'secure:hidden:111111') && secure.some((i) => i.id === 'secure:visible:111111'), 'rôles sécurisés : permission, rôle caché et rôle visible vérifiés');
secureRolesStorage.updateConfig(G, { roles: [] });

console.log('\nDestinataires');
ok(JSON.stringify((await svc.resolveContacts(guild)).userIds.sort()) === JSON.stringify(['adm', 'owner']), 'par défaut : propriétaire + administrateurs humains (pas les bots)');
guildConfigService.updateConfig(G, { emergencyContacts: { mode: 'owner', userIds: [], roleIds: [] } });
ok(JSON.stringify((await svc.resolveContacts(guild)).userIds) === JSON.stringify(['owner']), 'mode propriétaire');
guildConfigService.updateConfig(G, { emergencyContacts: { mode: 'custom', userIds: ['555555'], roleIds: ['666666'] } });
const custom = await svc.resolveContacts(guild);
ok(custom.userIds[0] === '555555' && custom.roleIds[0] === '666666', 'mode personnalisé : membres et rôles choisis');
ok(!guildConfigService.getConfig(G).emergencyContacts.userIds.includes('pas-un-id'), 'les identifiants sont validés');
let bad = false;
try {
  guildConfigService.updateConfig(G, { emergencyContacts: { mode: 'custom', userIds: ['pas-un-id'], roleIds: [] } });
} catch {
  bad = true;
}
ok(bad, 'un identifiant invalide est refusé');

console.log('\nAlertes');
guildConfigService.updateConfig(G, { emergencyContacts: { mode: 'admins', userIds: [], roleIds: [] } });
const test = await svc.notify(guild, [], true);
ok(test.channel && test.dms === 2 && sentChannel.length === 1 && dms.owner.length === 1 && dms.adm.length === 1, 'test : salon + un message privé par contact');
ok(/<@owner>/.test(sentChannel[0].content) && sentChannel[0].allowedMentions.users.includes('owner'), 'les contacts sont mentionnés dans le salon');

botPerms = new Set([P.ViewChannel, P.SendMessages, P.EmbedLinks]);
reportsStorage.updateConfig(G, { enabled: true, channelId: 'disparu' });
sentChannel.length = 0;
const t0 = Date.now();
ok((await svc.sweep(client, t0)) === 1 && sentChannel.length === 1 && /Signalements/.test(sentChannel[0].embeds[0].toJSON().description), 'problème détecté : alerte envoyée');
ok((await svc.sweep(client, t0 + 30 * 60_000)) === 0 && sentChannel.length === 1, 'même problème 30 min plus tard : pas de doublon');
ok((await svc.sweep(client, t0 + 25 * 3_600_000)) === 1, 'toujours présent après 24 h : rappel');
reportsStorage.updateConfig(G, { enabled: false });
await svc.sweep(client, t0 + 26 * 3_600_000);
reportsStorage.updateConfig(G, { enabled: true });
ok((await svc.sweep(client, t0 + 27 * 3_600_000)) === 1, 'problème résolu puis revenu : nouvelle alerte');

console.log('\nAucun moyen de prévenir');
logStorage.getConfig(G);
guild.systemChannelId = null;
guild.client.users.fetch = async () => ({ send: async () => { throw new Error('MP fermés'); } });
reportsStorage.updateConfig(G, { enabled: false });
await svc.sweep(client, t0 + 28 * 3_600_000);
reportsStorage.updateConfig(G, { enabled: true, channelId: 'disparu' });
ok((await svc.sweep(client, t0 + 29 * 3_600_000)) === 0, 'ni salon ni MP possible : rien n’est compté comme envoyé (nouvel essai au prochain passage)');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
