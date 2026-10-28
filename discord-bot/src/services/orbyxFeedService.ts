import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, PermissionFlagsBits } from 'discord.js';
import { guildConfigService } from './guildConfigService.js';
import { baseEmbed } from '../utils/embeds.js';
import { trg } from '../utils/tr.js';

export const ORBYX_URL = 'https://packs.ethone.dev';

interface MythicPull {
  at: number;
  user: { id: string; name: string };
  card: { n: string; s: string; i: string };
}

export function startOrbyxFeed(client: Client): void {
  let since = Date.now();
  const tick = async () => {
    const guilds = [...client.guilds.cache.values()].filter((g) => guildConfigService.getConfig(g.id).orbyxChannelId);
    if (!guilds.length) {
      since = Date.now();
      return;
    }
    const res = await fetch(`${ORBYX_URL}/api/feed/mythics?since=${since}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const pulls = (await res.json()) as MythicPull[];
    for (const pull of pulls) {
      since = Math.max(since, pull.at);
      for (const guild of guilds) {
        const member = await guild.members.fetch(pull.user.id).catch(() => null);
        if (!member) continue;
        const channel = guild.channels.cache.get(guildConfigService.getConfig(guild.id).orbyxChannelId ?? '');
        const me = guild.members.me;
        if (!channel?.isTextBased() || !me || !channel.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) continue;
        const embed = baseEmbed('info', { color: 0xff375f })
          .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
          .setTitle(trg(guild, '🌈 Carte Mythique obtenue !'))
          .setDescription(trg(guild, '{user} vient d’obtenir **{card}** · {series}', { user: `<@${member.id}>`, card: pull.card.n, series: pull.card.s }))
          .setImage(pull.card.i);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(`${ORBYX_URL}/#joueur/${member.id}`).setLabel(trg(guild, 'Voir la collection'))
        );
        await channel.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } }).catch(() => {});
      }
    }
  };
  setInterval(() => void tick().catch(() => {}), 60_000).unref();
}
