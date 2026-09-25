/** Niveaux : désactivé par défaut, XP en vocal, niveau maximum, fils/forums, départ d'un membre. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ChannelType, Collection } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-leveling-test-')));
const { LevelingConfigSchema } = await import('../src/modules/leveling/types/levelingConfig.js');
const { levelingStorage } = await import('../src/modules/leveling/storage/levelingStorage.js');
const { xpWriteBuffer } = await import('../src/modules/leveling/storage/xpWriteBuffer.js');
const { levelingService } = await import('../src/modules/leveling/services/levelingService.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

console.log('\nValeurs par défaut');
const def = LevelingConfigSchema.parse({});
ok(def.enabled === false && def.voiceXpEnabled === false && def.leaderboardPublic === false, 'module, XP vocal et classement public désactivés par défaut');
ok(def.keepXpOnLeave && def.xpInThreads && def.leaderboardOnDiscord && def.rewardAnnounceType === 'with_levelup', 'options sûres par défaut (XP conservé, fils comptés, comportement actuel des récompenses)');
ok(!LevelingConfigSchema.safeParse({ accentColor: 'rouge' }).success, 'couleur invalide refusée');

const G = '100000000000000021';
const mkMember = (id: string, voice: any = {}, roles: string[] = []): any => ({
  id, user: { id, bot: false, username: `u${id}`, displayAvatarURL: () => null, tag: `u${id}#0` },
  voice: { selfMute: false, selfDeaf: false, serverMute: false, serverDeaf: false, ...voice },
  roles: { cache: new Collection(roles.map((r) => [r, {}])) },
  guild: { id: G },
});
const bot = mkMember('bot1');
bot.user.bot = true;
const room = (id: string, members: any[], parentId: string | null = null): any => ({
  id, parentId, isVoiceBased: () => true, members: new Collection(members.map((m) => [m.id, m])),
});
const guild: any = { id: G, afkChannelId: 'afk', channels: { cache: new Collection() } };
const add = (c: any) => guild.channels.cache.set(c.id, c);
const client: any = { guilds: { cache: new Collection([[G, guild]]) } };
const xp = (id: string) => xpWriteBuffer.getUser(G, id).totalXp;

console.log('\nXP en vocal');
add(room('vc1', [mkMember('a'), mkMember('b'), mkMember('c', { selfMute: true }), bot]));
add(room('afk', [mkMember('d'), mkMember('e')]));
add(room('seul', [mkMember('f')]));
add(room('exclu', [mkMember('g'), mkMember('h')], 'cat-exclue'));
levelingStorage.updateConfig(G, { enabled: false, voiceXpEnabled: true, excludedChannelIds: ['cat-exclue'] });
ok((await levelingService.voiceTick(client)) === 0, 'module désactivé : personne ne gagne rien');
levelingStorage.updateConfig(G, { enabled: true, voiceXpEnabled: false });
ok((await levelingService.voiceTick(client)) === 0, 'XP vocal désactivé : personne ne gagne rien');
levelingStorage.updateConfig(G, { enabled: true, voiceXpEnabled: true, voiceXpPerMinute: 5, voiceXpMinMembers: 2 });
const n = await levelingService.voiceTick(client);
ok(n === 2 && xp('a') === 5 && xp('b') === 5, 'deux membres actifs ensemble gagnent 5 XP par minute');
ok(xp('c') === 0, 'un membre en sourdine ne gagne rien');
ok(xp('d') === 0 && xp('e') === 0, 'le salon AFK ne rapporte rien');
ok(xp('f') === 0, 'seul dans un salon : rien');
ok(xp('g') === 0 && xp('h') === 0, 'catégorie exclue : rien');
levelingStorage.updateConfig(G, { voiceXpIgnoreMuted: false, voiceXpMinMembers: 1 });
await levelingService.voiceTick(client);
ok(xp('c') === 5 && xp('f') === 5, 'réglages assouplis : sourdine et salon solo comptent');
ok(xp('bot1') === 0, 'les bots ne gagnent jamais d’XP');

console.log('\nNiveau maximum');
const u = xpWriteBuffer.getUser(G, 'max');
u.level = 3;
u.totalXp = 600;
xpWriteBuffer.updateUser(u);
add(room('vcmax', [mkMember('max'), mkMember('max2')]));
levelingStorage.updateConfig(G, { maxLevel: 3, voiceXpMinMembers: 2 });
await levelingService.voiceTick(client);
ok(xp('max') === 600 && xp('max2') === 5, 'au niveau maximum, l’XP n’augmente plus');

console.log('\nMessages : fils et forums');
const msg = (channel: any, content = 'un message assez long'): any => ({
  content, guild: { id: G, members: { me: null }, roles: { cache: new Collection() } }, author: { id: 'w', bot: false, username: 'w', displayAvatarURL: () => null },
  member: { ...mkMember('w'), guild: { id: G, members: { me: null }, roles: { cache: new Collection() } } }, channel,
});
const text = { id: 'txt', parentId: null, isThread: () => false };
const thread = { id: 'th', parentId: 'txt', isThread: () => true, parent: { type: ChannelType.GuildText } };
const forum = { id: 'fp', parentId: 'fo', isThread: () => true, parent: { type: ChannelType.GuildForum } };
levelingStorage.updateConfig(G, { maxLevel: 0, minXp: 10, maxXp: 10, cooldownSeconds: 5, xpInThreads: false, xpInForums: true });
await levelingService.handleMessage(msg(thread));
ok(xp('w') === 0, 'fil désactivé : aucun XP');
await levelingService.handleMessage(msg(forum));
ok(xp('w') === 10, 'forum autorisé : XP crédité');
levelingStorage.updateConfig(G, { excludedChannelIds: ['txt'] });
const before = xp('w');
(levelingService as any).cooldowns.clear();
await levelingService.handleMessage(msg(thread));
ok(xp('w') === before, 'un fil d’un salon exclu hérite de l’exclusion');

console.log('\nDépart d’un membre');
const aBefore = xp('a');
levelingService.handleMemberLeave({ guild: { id: G }, id: 'a' } as any);
ok(xp('a') === aBefore && aBefore > 0, 'XP conservé par défaut');
levelingStorage.updateConfig(G, { keepXpOnLeave: false });
levelingService.handleMemberLeave({ guild: { id: G }, id: 'a' } as any);
ok(xp('a') === 0, 'XP effacé au départ quand le serveur l’a choisi');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
