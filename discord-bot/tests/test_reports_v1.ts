/** Signalements : message d'équipe agrégé, cooldown, refus, boutons de traitement, droits. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Collection, PermissionFlagsBits } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-reports-test-')));
const { reportsService } = await import('../src/modules/reports/services/reportsService.js');
const { reportsStorage } = await import('../src/modules/reports/storage/reportsStorage.js');
const { moderationRepository } = await import('../src/modules/moderation/storage/moderationRepository.js');
const reg = await import('../src/services/moduleRegistry.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = 'g-reports';
const sent: any[] = [];
const edits: any[] = [];
const staffChannel: any = {
  id: 'staff-ch',
  isTextBased: () => true,
  send: async (p: any) => {
    const m = { id: `m${sent.length + 1}`, edit: async (e: any) => { edits.push(e); } };
    sent.push(p);
    staffChannel._last = m;
    return m;
  },
  messages: { fetch: async () => staffChannel._last ?? null },
};
const users: Record<string, any> = {
  bad: { id: 'bad', tag: 'bad#0', username: 'bad', bot: false, createdAt: new Date(Date.now() - 400 * 86_400_000), displayAvatarURL: () => null },
  r1: { id: 'r1', tag: 'r1#0', username: 'r1', bot: false },
  r2: { id: 'r2', tag: 'r2#0', username: 'r2', bot: false },
  robot: { id: 'robot', tag: 'robot#0', username: 'robot', bot: true },
};
const client: any = { users: { fetch: async (id: string) => users[id] ?? null } };
const guild: any = {
  id: G, client,
  channels: { cache: new Collection([['staff-ch', staffChannel]]) },
  members: { fetch: async (id: string) => (id === 'bad' ? { displayName: 'Mauvais', user: users.bad, joinedAt: new Date(Date.now() - 30 * 86_400_000) } : null) },
};

console.log('\nDésactivé par défaut');
const before = await reportsService.submit(client, guild, users.r1, users.bad, 'insultes répétées');
ok(!before.ok && /pas configuré/.test((before as any).error), 'refusé tant que le système n’est pas configuré');
ok(!reg.isModuleEnabled(G, 'reports'), 'le registre affiche « désactivé »');
reportsStorage.updateConfig(G, { enabled: true, channelId: 'staff-ch', cooldownSeconds: 60 });
ok(reg.isModuleEnabled(G, 'reports'), 'activé : le registre le voit');

console.log('\nRefus');
const self = await reportsService.submit(client, guild, users.bad, users.bad, 'moi-même');
ok(!self.ok && /toi-même/.test((self as any).error), 'on ne peut pas se signaler soi-même');
const bot = await reportsService.submit(client, guild, users.r1, users.robot, 'un bot');
ok(!bot.ok && /bots/.test((bot as any).error), 'les bots ne sont pas signalables');

console.log('\nPremier signalement');
const first = await reportsService.submit(client, guild, users.r1, users.bad, 'insultes répétées dans #général', { channelId: 'gen', messageId: '999', messageContent: 'texte insultant @everyone' });
ok(first.ok && sent.length === 1, 'signalement enregistré, message envoyé à l’équipe');
const emb = sent[0].embeds[0].toJSON();
ok(/Signalement contre Mauvais/.test(emb.title) && /insultes répétées/.test(emb.description) && /r1|<@r1>/.test(emb.description), 'titre, motif et auteur du signalement affichés');
ok(/\\@everyone/.test(emb.description) && !/[^\\]@everyone/.test(emb.description), 'les mentions saisies par le membre sont neutralisées (@everyone échappé)');
ok(/En attente/.test(emb.description), 'état « en attente »');
ok(sent[0].components.length === 2, 'menu de sanction + boutons présents');
const customIds = sent[0].components.flatMap((r: any) => r.toJSON().components.map((c: any) => c.custom_id));
ok(customIds.includes('rep_take:bad') && customIds.includes('rep_done:bad') && customIds.includes('rep_sanction:bad'), 'identifiants des composants liés au membre signalé');

console.log('\nCooldown et agrégation');
const again = await reportsService.submit(client, guild, users.r1, users.bad, 'encore');
ok(!again.ok && /Patiente/.test((again as any).error), 'le même membre ne peut pas spammer les signalements');
const second = await reportsService.submit(client, guild, users.r2, users.bad, 'harcèlement en messages privés');
ok(second.ok && sent.length === 1 && edits.length === 1, 'un second signalement du même membre MET À JOUR le message (pas de doublon)');
ok(/r2|<@r2>/.test(edits[0].embeds[0].toJSON().description) && /<@r1>/.test(edits[0].embeds[0].toJSON().description), 'les deux signalements apparaissent dans le même message');

console.log('\nTraitement');
const memberPerm = (perms: bigint[], roles: string[] = []) => ({ permissions: { has: (p: bigint) => perms.includes(p) }, roles: { cache: new Set(roles) } }) as any;
ok(reportsService.canHandle(memberPerm([PermissionFlagsBits.ModerateMembers]), G) && !reportsService.canHandle(memberPerm([]), G), 'droit de traiter : permission « Exclure des membres »');
reportsStorage.updateConfig(G, { staffRoleId: 'role-staff' });
ok(reportsService.canHandle(memberPerm([], ['role-staff']), G), '…ou rôle de l’équipe configuré');

let replied: any = null;
const takeBtn: any = { customId: 'rep_take:bad', guild, user: { id: 'mod1', tag: 'mod1#0' }, member: memberPerm([PermissionFlagsBits.ModerateMembers]), reply: async (o: any) => { replied = o; }, update: async (p: any) => { replied = p; } };
await reportsService.handleButton(takeBtn);
ok(/Pris en charge par <@mod1>/.test(replied.embeds[0].toJSON().description), '« Prendre en charge » : le modérateur est affiché');
const denied: any = { ...takeBtn, member: memberPerm([]), reply: async (o: any) => { replied = o; } };
replied = null;
await reportsService.handleButton(denied);
ok(replied && !replied.components && replied.flags !== undefined, 'un membre sans droits est refusé (message éphémère)');
await reportsService.handleButton({ ...takeBtn, customId: 'rep_done:bad' });
const finished = replied;
ok(finished.components.length === 0 && /Traité par <@mod1>/.test(finished.embeds[0].toJSON().description), '« Marquer comme traité » : message clos, sans boutons');
ok(moderationRepository.getReports(G, { reportedUserId: 'bad' }).every((r) => r.status === 'ACTIONED'), 'les deux signalements passent à « traité »');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
