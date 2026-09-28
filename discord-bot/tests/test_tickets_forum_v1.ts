/** Tickets en mode forum : création du post, tags de statut, fermeture (archive + lock), et mode salon inchangé. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ChannelType } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-ticket-forum-')));
const { ticketRepository } = await import('../src/modules/tickets/storage/ticketRepository.js');
const { ticketService } = await import('../src/modules/tickets/services/ticketService.js');
const { ensureTicketForumTags } = await import('../src/modules/tickets/services/ticketForum.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = 'g-forum-test';
const TAGS = { open: 't-open', inProgress: 't-prog', resolved: 't-res', closed: 't-closed' };

// --- Fakes ---
const calls: string[] = [];
const fakeMessages = { fetch: async () => new Map() };
function makeForum(tags: any[]) {
  const forum: any = {
    id: 'forum1',
    type: ChannelType.GuildForum,
    availableTags: tags,
    permissionsFor: () => ({ has: () => true }),
    created: null as any,
    threads: {
      create: async (o: any) => {
        forum.created = o;
        const thread: any = {
          id: `post-${guild.channels.cache.size}`,
          name: o.name,
          parent: forum,
          appliedTags: [...o.appliedTags],
          archived: false,
          locked: false,
          sent: [] as any[],
          added: [] as string[],
          members: { add: async (id: string) => void thread.added.push(id) },
          send: async (p: any) => void thread.sent.push(p),
          messages: fakeMessages,
          setAppliedTags: async (t: string[]) => {
            calls.push(`tags:${t.join(',')}`);
            thread.appliedTags = t;
          },
          setLocked: async (v: boolean) => void ((thread.locked = v), calls.push(`lock:${v}`)),
          setArchived: async (v: boolean) => void ((thread.archived = v), calls.push(`archive:${v}`)),
          delete: async () => void calls.push('delete'),
        };
        guild.channels.cache.set(thread.id, thread);
        return thread;
      },
    },
    setAvailableTags: async (next: any[]) => {
      forum.availableTags = next.map((t, i) => ({ id: t.id ?? `new-${i}`, name: t.name, moderated: false, emoji: t.emoji ?? null }));
      return forum;
    },
  };
  return forum;
}

const textChannels: any[] = [];
const guild: any = {
  id: G,
  name: 'Serveur',
  roles: { everyone: { id: G } },
  members: { me: { id: 'bot' } },
  channels: {
    cache: new Map<string, any>(),
    fetch: async (id: string) => guild.channels.cache.get(id) ?? null,
    create: async (o: any) => {
      const ch: any = {
        id: `chan-${textChannels.length + 1}`,
        name: o.name,
        opts: o,
        guild,
        sent: [] as any[],
        messages: fakeMessages,
        send: async (p: any) => void ch.sent.push(p),
        delete: async () => void calls.push('channel-delete'),
      };
      textChannels.push(ch);
      guild.channels.cache.set(ch.id, ch);
      return ch;
    },
  },
};
const mkUser = (n: number) => ({ id: `u${n}`, username: `user${n}`, tag: `user${n}#0`, displayAvatarURL: () => 'http://x/a.png' }) as any;
const staff = { id: 's1', tag: 'staff#0' };

(ticketService as any).discordClient = { guilds: { cache: new Map([[G, guild]]) } };
ticketRepository.saveCategory({
  id: 'cat1', guildId: G, name: 'Support', emoji: '🎫', description: '', color: '#5865F2', discordCategoryId: null,
  supportRoleIds: ['role1'], assignedTeamId: null, defaultPriority: 'NORMAL', autoCloseInactivityHours: 24,
  cooldownMinutes: 0, maxTicketsPerUser: 5, autoTranscript: true, formFields: [],
  welcomeMessage: 'Bonjour {user}',
} as any);

// --- 1. Mode forum : création ---
const forum = makeForum([
  { id: TAGS.open, name: 'Ouvert' }, { id: TAGS.inProgress, name: 'En cours' },
  { id: TAGS.resolved, name: 'Résolu' }, { id: TAGS.closed, name: 'Fermé' }, { id: 'other', name: 'Autre' },
]);
guild.channels.cache.set(forum.id, forum);
ticketRepository.saveConfig(G, { ...ticketRepository.getConfig(G), mode: 'forum', forumChannelId: forum.id, forumTagIds: TAGS });

console.log('Forum : création');
const t1 = await ticketService.createTicket(guild, mkUser(1), 'cat1', { Sujet: 'Mon   bug\nurgent' });
const post = guild.channels.cache.get(t1.channelId);
const c = forum.created;
ok(c.name === 'TICKET-0001 · Mon bug urgent', `nom du post = numéro · sujet (${c.name})`);
ok(c.appliedTags.join() === TAGS.open, 'tag Ouvert appliqué à la création');
ok(c.message.embeds?.length === 1 && c.message.components?.length === 1, 'embed d’accueil + boutons dans le premier message');
ok(String(c.message.content).includes('<@u1>') && String(c.message.content).includes('<@&role1>'), 'demandeur et rôle support mentionnés');
ok(post?.added.join() === 'u1', 'demandeur ajouté au post (thread.members.add)');
ok(textChannels.length === 0, 'aucun salon privé créé');
ok(t1.mode === 'forum' && t1.threadId === post.id && t1.channelId === post.id, 'ticket enregistré avec channelId = threadId, mode forum');
ok(ticketRepository.getTicketById(G, t1.id)?.mode === 'forum', 'mode forum persisté');
const t2 = await ticketService.createTicket(guild, mkUser(2), 'cat1', { Description: 'x'.repeat(300) });
ok(t2.channelId !== t1.channelId && forum.created.name === 'TICKET-0002 · Support', 'sans sujet : nom = numéro · catégorie');
const longT = await ticketService.createTicket(guild, mkUser(9), 'cat1', { Sujet: 'y'.repeat(300) });
ok(forum.created.name.length === 100 && longT.id === 'TICKET-0003', 'nom du post plafonné à 100 caractères');

// --- 2. Statut <-> tags ---
console.log('Forum : tags de statut');
post.appliedTags = [TAGS.open, 'other'];
await ticketService.claimTicket(G, t1.id, staff);
ok(post.appliedTags.join() === 'other,' + TAGS.inProgress, `claim : Ouvert remplacé par En cours, autres tags conservés (${post.appliedTags})`);
ok(post.sent.length === 1, 'message de prise en charge envoyé dans le post');
await ticketService.unclaimTicket(G, t1.id, staff);
ok(post.appliedTags.join() === 'other,' + TAGS.open, 'unclaim : retour au tag Ouvert');

calls.length = 0;
ticketRepository.saveConfig(G, { ...ticketRepository.getConfig(G), forumTagIds: { open: 'gone', inProgress: 'gone2' } });
await ticketService.claimTicket(G, t1.id, staff);
ok(!calls.some((x) => x.startsWith('tags:')), 'tags configurés absents du forum : ignoré silencieusement');
ticketRepository.saveConfig(G, { ...ticketRepository.getConfig(G), forumTagIds: TAGS });

// --- 3. Fermeture ---
console.log('Forum : fermeture / réouverture');
calls.length = 0;
const closed = await ticketService.closeTicket(guild, t1.id, staff, 'Résolu');
ok(closed.status === 'CLOSED', 'ticket CLOSED');
ok(post.sent.at(-1)?.embeds?.length === 1, 'message de fermeture posté');
ok(post.appliedTags.includes(TAGS.closed) && !post.appliedTags.includes(TAGS.inProgress) && post.appliedTags.includes('other'), 'tag Fermé remplace le tag de statut');
ok(post.locked === true && post.archived === true, 'post verrouillé + archivé');
ok(calls.indexOf('lock:true') < calls.indexOf('archive:true') && !calls.includes('delete'), 'lock avant archive, post jamais supprimé');
const reopened = await ticketService.reopenTicket(guild, t1.id, staff);
ok(reopened.status === 'OPEN' && !post.archived && !post.locked && post.appliedTags.includes(TAGS.open), 'réouverture : post désarchivé/déverrouillé + tag Ouvert');

// --- 4. ensureTicketForumTags ---
console.log('ensureTicketForumTags');
const empty = makeForum([{ id: 'x1', name: 'ouvert' }]);
const r1 = await ensureTicketForumTags(empty);
ok(r1.ids.open === 'x1' && r1.created.length === 3 && Object.keys(r1.ids).length === 4 && empty.availableTags.length === 4, 'crée les tags manquants, réutilise un tag existant (casse ignorée)');
const again = await ensureTicketForumTags(empty);
ok(again.created.length === 0 && again.ids.closed === r1.ids.closed, 'idempotent');
const full = makeForum(Array.from({ length: 19 }, (_, i) => ({ id: `f${i}`, name: `Tag ${i}` })));
const r2 = await ensureTicketForumTags(full);
ok(full.availableTags.length === 20 && r2.created.length === 1 && r2.skipped.length === 3, 'respecte la limite de 20 tags (1 créé, 3 ignorés)');

// --- 5. Mode salon inchangé ---
console.log('Mode salon inchangé');
ticketRepository.saveConfig(G, { ...ticketRepository.getConfig(G), mode: 'channel' });
const forumCalls = forum.created;
const tc = await ticketService.createTicket(guild, mkUser(3), 'cat1');
const ch = textChannels[0];
ok(!!ch && ch.opts.type === ChannelType.GuildText && Array.isArray(ch.opts.permissionOverwrites) && ch.opts.permissionOverwrites.length >= 4, 'salon textuel privé avec permission overwrites');
ok(forum.created === forumCalls, 'aucun post de forum créé');
ok(tc.channelId === ch.id && tc.mode === undefined && tc.threadId === undefined, 'ticket sans champs forum');
ok(ch.sent.length === 1 && ch.sent[0].embeds.length === 1 && ch.sent[0].components.length === 1, 'panel envoyé via channel.send');
ok(ticketRepository.getConfig('autre-serveur').mode === 'channel', 'défaut de config = channel');
calls.length = 0;
await ticketService.claimTicket(G, tc.id, staff);
ok(ch.sent.length === 2 && !calls.some((x) => x.startsWith('tags:')), 'claim : message dans le salon, aucun tag');
await ticketService.closeTicket(guild, tc.id, staff, 'ok');
await new Promise((r) => setTimeout(r, 5200));
ok(calls.includes('channel-delete') && !calls.some((x) => x.startsWith('archive') || x.startsWith('lock')), 'fermeture : salon supprimé après 5 s, pas d’archive');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
