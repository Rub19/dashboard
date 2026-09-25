/** AutoMod « détection des infractions » : tout désactivé par défaut, émojis, mentions interdites, mise en forme, rôles/salons ignorés. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Collection } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-automod-test-')));
const { AutoModConfigSchema } = await import('../src/modules/automod/types/autoMod.js');
const { autoModRepository } = await import('../src/modules/automod/storage/autoModRepository.js');
const { countEmojis, EmojiDetector } = await import('../src/modules/automod/detectors/emojiDetector.js');
const { PingDetector } = await import('../src/modules/automod/detectors/pingDetector.js');
const { findMarkdown, stripMarkdown } = await import('../src/modules/automod/detectors/markdownDetector.js');
const { autoModService } = await import('../src/modules/automod/services/autoModService.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

console.log('\nTout est désactivé par défaut');
const def = AutoModConfigSchema.parse({});
const detectors = ['spam', 'flood', 'links', 'invites', 'mentions', 'ghostPing', 'caps', 'keywords', 'emojis', 'pings', 'markdown', 'regex', 'profiles'] as const;
ok(def.enabled === false && detectors.every((k) => def[k].enabled === false), 'interrupteur général et 13 détecteurs désactivés');
ok(def.strikes.enabled === false && def.strikes.progressiveSteps.length === 0, 'aucune sanction automatique par défaut');
ok(def.emojis.actions.includes('STRIKE') && def.caps.actions.includes('STRIKE'), 'les infractions comptent pour les sanctions automatiques');

console.log('\nÉmojis');
ok(countEmojis('salut 😀😀 <:pepe:123456789012345678> <a:dance:223456789012345678> 👍🏽') === 5, 'compte émojis Unicode, personnalisés et animés');
ok(countEmojis('du texte normal, 1 + 2 = 3 © ®') === 0, 'texte sans émoji : 0');
const cfg = (patch: any) => AutoModConfigSchema.parse({ enabled: true, ...patch });
const msg = (content: string, extra: any = {}): any => ({ content, author: { id: 'u1' }, ...extra, mentions: { users: new Collection(), roles: new Collection(), everyone: false, ...extra.mentions } });
ok(!EmojiDetector.check(msg('😀'.repeat(11)), cfg({})).triggered, 'détecteur désactivé : rien');
ok(EmojiDetector.check(msg('😀'.repeat(11)), cfg({ emojis: { enabled: true, maxEmojis: 10 } })).triggered, '11 émojis pour un maximum de 10 : détecté');
ok(!EmojiDetector.check(msg('😀'.repeat(10)), cfg({ emojis: { enabled: true, maxEmojis: 10 } })).triggered, 'exactement 10 : toléré');

console.log('\nMentions interdites');
const pc = cfg({ pings: { enabled: true, userIds: ['111111'], roleIds: ['222222'] } });
ok(PingDetector.check(msg('hey', { mentions: { users: new Collection([['111111', {}]]) } }), pc).triggered, 'membre protégé mentionné : détecté');
ok(PingDetector.check(msg('hey', { mentions: { roles: new Collection([['222222', {}]]) } }), pc).triggered, 'rôle protégé mentionné : détecté');
ok(!PingDetector.check(msg('hey', { mentions: { users: new Collection([['999999', {}]]) } }), pc).triggered, 'autre mention : ignorée');
ok(!PingDetector.check(msg('hey', { author: { id: '111111' }, mentions: { users: new Collection([['111111', {}]]) } }), pc).triggered, 'se mentionner soi-même est permis');
ok(!PingDetector.check(msg('hey', { mentions: { users: new Collection([['111111', {}]]) } }), cfg({ pings: { enabled: true } })).triggered, 'aucune cible configurée : rien');

console.log('\nMise en forme');
const all = ['header', 'bold', 'italic', 'underline', 'strikethrough', 'spoiler', 'inlineCode', 'codeBlock', 'quote', 'list', 'maskedLink', 'subtext'] as const;
const sample: Record<string, string> = {
  header: '# Titre', bold: 'du **gras**', italic: 'du *penché*', underline: 'du __souligné__', strikethrough: 'du ~~barré~~', spoiler: 'un ||secret||',
  inlineCode: 'du `code`', codeBlock: '```js\nlet a = 1\n```', quote: '> citation', list: '- élément', maskedLink: '[ici](https://exemple.fr)', subtext: '-# petit',
};
for (const t of all) ok(findMarkdown(sample[t], [t]).includes(t), `détecte « ${t} »`);
ok(findMarkdown('un texte tout simple', [...all]).length === 0, 'texte simple : rien');
ok(findMarkdown('du **gras**', ['italic']).length === 0, 'seuls les types choisis sont détectés (gras non interdit)');
ok(stripMarkdown('# Titre **fort** et ||secret||', ['header', 'bold', 'spoiler']) === 'Titre fort et secret', 'retire plusieurs mises en forme');
ok(stripMarkdown('**gras** et `code`', ['inlineCode']) === '**gras** et code', 'ne retire que les types interdits');
ok(stripMarkdown('```js\nlet a = 1\n```', ['codeBlock']) === 'let a = 1\n', 'bloc de code : contenu conservé');

console.log('\nDe bout en bout : mise en forme, rôles ignorés, salons ignorés');
const G = '100000000000000009';
const sent: any[] = [];
let deleted = 0;
const mk = (content: string, opts: { roles?: string[]; channelId?: string } = {}): any => ({
  id: 'm1', content, channelId: opts.channelId ?? 'c1', deletable: true,
  delete: async () => { deleted++; },
  author: { id: 'u1', bot: false, tag: 'u1#0' },
  guild: { id: G, name: 'Test', channels: { cache: new Collection() } },
  channel: { id: opts.channelId ?? 'c1', parentId: null, send: async (p: any) => { sent.push(p); return { delete: async () => {} }; } },
  member: { id: 'u1', displayName: 'Lucas', user: { tag: 'u1#0' }, permissions: { has: () => false }, roles: { cache: new Collection((opts.roles ?? []).map((r) => [r, {}])) }, send: async () => {}, moderatable: false },
  mentions: { users: new Collection(), roles: new Collection(), everyone: false },
  client: {},
});
autoModRepository.updateConfig(G, { enabled: true, markdown: { ...def.markdown, enabled: true, types: ['bold'], removeMarkdown: true, actions: ['DELETE'], silent: true, ignoredRoleIds: ['staff'], ignoredChannelIds: ['libre'] } as any });
const hit = await autoModService.processMessage(mk('du **gras** ici'));
ok(hit === true && deleted === 1, 'message avec du gras : supprimé');
ok(sent.length === 1 && sent[0].content === '**Lucas** : du gras ici' && sent[0].allowedMentions.parse.length === 0, 'renvoyé sans mise en forme, sans mention possible');
ok((await autoModService.processMessage(mk('du **gras** ici', { roles: ['staff'] }))) === false && deleted === 1, 'rôle ignoré : rien');
ok((await autoModService.processMessage(mk('du **gras** ici', { channelId: 'libre' }))) === false && deleted === 1, 'salon ignoré : rien');
ok((await autoModService.processMessage(mk('rien de spécial'))) === false, 'message normal : rien');

console.log('\nMigration « tout désactivé »');
const H = '100000000000000010';
autoModRepository.updateConfig(H, { enabled: true, caps: { ...def.caps, enabled: true }, strikes: { ...def.strikes, enabled: true, progressiveSteps: [{ strikeCount: 3, action: 'BAN', durationSeconds: 0, reason: 'perso' }] } } as any);
const I = '100000000000000011';
autoModRepository.updateConfig(I, { strikes: { ...def.strikes, progressiveSteps: [
  { strikeCount: 1, action: 'WARN', durationSeconds: 0, reason: 'a' }, { strikeCount: 2, action: 'TIMEOUT', durationSeconds: 300, reason: 'b' },
  { strikeCount: 3, action: 'TIMEOUT', durationSeconds: 3600, reason: 'c' }, { strikeCount: 4, action: 'KICK', durationSeconds: 0, reason: 'd' }, { strikeCount: 5, action: 'BAN', durationSeconds: 0, reason: 'e' },
] } });
const n = autoModRepository.turnEverythingOff();
ok(n >= 3 && !autoModRepository.getConfig(H).enabled && !autoModRepository.getConfig(H).caps.enabled, 'serveurs existants : tout est coupé');
ok(autoModRepository.getConfig(H).strikes.progressiveSteps.length === 1, 'une échelle de sanctions personnalisée est conservée');
ok(autoModRepository.getConfig(I).strikes.progressiveSteps.length === 0, 'l’ancienne échelle par défaut est effacée');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
