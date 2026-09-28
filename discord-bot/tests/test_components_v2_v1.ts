/** Panneaux Components V2 (aide, /bot) + émojis d'application. */
import { MessageFlags } from 'discord.js';
import { HelpPanel, HELP_CATEGORIES } from '../src/commands/general/helpPanel.js';
import { botCommand } from '../src/commands/general/bot.js';
import { appEmojiName, getAppEmoji, appEmojiMap } from '../src/services/appEmojis.js';
import { icon } from '../src/utils/v2.js';
import { getTranslation } from '../src/utils/i18n.js';

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const ids = (json: any): string[] => JSON.stringify(json).match(/"custom_id":"([^"]+)"/g)?.map((m) => m.slice(13, -1)) ?? [];

const conf: any = { language: 'fr', prefix: '!', botName: 'Etho', prefixCommandsEnabled: true, responseVisibility: 'PUBLIC' };

// Émojis d'application
ok(appEmojiName('moderation.png') === 'etho_moderation', 'nom : moderation.png -> etho_moderation');
ok(appEmojiName('My Icon-2.PNG') === 'etho_my_icon_2', 'nom : assaini en [a-z0-9_]');
ok(appEmojiName('a'.repeat(60) + '.png').length === 32, 'nom : tronqué à 32');
ok(getAppEmoji('etho_moderation') === undefined, 'getAppEmoji : undefined avant synchro');
ok(icon('moderation', '🛡️') === '🛡️', 'icon : repli Unicode');
appEmojiMap().set('etho_moderation', '<:etho_moderation:123456789012345678>');
ok(getAppEmoji('etho_moderation') === '<:etho_moderation:123456789012345678>', 'getAppEmoji : mention après synchro');
ok(icon('moderation', '🛡️') === '<:etho_moderation:123456789012345678>', 'icon : émoji d\'application si dispo');

// Panneau d'aide
for (const lang of ['fr', 'en', 'es', 'de']) {
  for (const key of ['home', 'moderation']) {
    const view = HelpPanel.buildView({ categoryKey: key, guildConfig: { ...conf, language: lang }, requesterTag: 'tester', commands: [] });
    const payload: any = { ...view, flags: MessageFlags.IsComponentsV2 };
    const json = view.components.map((c) => c.toJSON());
    const t = getTranslation(lang as any);
    ok((payload.flags & MessageFlags.IsComponentsV2) !== 0 && !('content' in payload) && !('embeds' in payload), `[${lang}/${key}] flags V2, ni content ni embeds`);
    ok(json.length === 1 && (json[0] as any).type === 17 && (json[0] as any).accent_color != null, `[${lang}/${key}] un conteneur avec couleur d'accent`);
    ok(JSON.stringify(json).includes(key === 'home' ? t.help_home_heading : t.help_cat_moderation_name), `[${lang}/${key}] titre présent`);
    const got = ids(json);
    ok(got.includes('help_select_category') && got.includes('help_btn_home') && got.some((i) => i.startsWith('help_btn_nav:')), `[${lang}/${key}] menu + boutons d'origine`);
  }
}
const homeJson = JSON.stringify(HelpPanel.buildView({ guildConfig: conf, requesterTag: 't', commands: [] }).components[0].toJSON());
ok(homeJson.includes('etho_moderation'), 'accueil : émoji d\'application utilisé quand dispo');
ok(HELP_CATEGORIES.length === 9, 'catégories intactes');

// /bot en V2 (info, status, ping)
for (const sub of ['info', 'status', 'ping']) {
  let sent: any = null;
  const ctx: any = {
    isSlash: false, args: [sub], guildConfig: conf,
    client: { guilds: { cache: { size: 1, reduce: () => 10 } }, ws: { ping: 42 }, user: { displayAvatarURL: () => 'https://x/a.png' } },
    deferReply: async () => {},
    reply: async (p: any) => { sent = p; },
  };
  await botCommand.execute(ctx);
  ok(sent?.componentsV2 === true && !('embeds' in sent) && !('content' in sent) && sent.components?.length === 1, `/bot ${sub} : payload V2`);
  ok(JSON.stringify(sent.components[0].toJSON()).includes('"type":17') && JSON.stringify(sent.components[0].toJSON()).includes('discord.gg/ethone'), `/bot ${sub} : conteneur + boutons lien`);
}

if (fail) { console.error(`\n${fail} échec(s)`); process.exit(1); }
console.log('\nOK');
