import { Colors, EmbedBuilder } from 'discord.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { formatString, type TranslationDictionary } from '../../../utils/i18n.js';

export type SanctionDmKind = 'warn' | 'kick' | 'ban';

interface SanctionDmOptions {
  guildName: string;
  reason?: string | null;
  /** Tag du modérateur — ajouté en champ seulement s'il est fourni (les commandes
   *  automatiques n'ont pas toujours de modérateur humain à afficher). */
  moderatorTag?: string | null;
}

const KIND_META: Record<SanctionDmKind, { color: number; titleKey: keyof TranslationDictionary; descKey: keyof TranslationDictionary }> = {
  warn: { color: Colors.Yellow, titleKey: 'sanction_dm_warn_title', descKey: 'sanction_dm_warn_desc' },
  kick: { color: Colors.Orange, titleKey: 'sanction_dm_kick_title', descKey: 'sanction_dm_kick_desc' },
  ban: { color: Colors.Red, titleKey: 'sanction_dm_ban_title', descKey: 'sanction_dm_ban_desc' },
};

/**
 * Construit l'embed de notification MP envoyé à l'utilisateur sanctionné.
 * Source unique de vérité pour les deux chemins qui notifient un membre :
 * les commandes manuelles (`/warn`, `/ban`, `/kick`) et le pipeline automatique
 * (`sanctionService.ts`, auto-modération / escalade) — pour qu'ils restent
 * strictement identiques. Réutilise les clés i18n `sanction_dm_*` déjà
 * traduites en fr/en/es/de.
 */
export function buildSanctionDmEmbed(
  kind: SanctionDmKind,
  t: TranslationDictionary,
  { guildName, reason, moderatorTag }: SanctionDmOptions,
): EmbedBuilder {
  const meta = KIND_META[kind];
  const embed = baseEmbed('default', { color: meta.color, footerText: t.sanction_dm_footer })
    .setTitle(formatString(t[meta.titleKey] as string, { guildName }))
    .setDescription(formatString(t[meta.descKey] as string, { guildName }))
    .addFields({ name: t.modlog_field_reason, value: reason || t.modlog_reason_none, inline: false });

  if (moderatorTag) {
    embed.addFields({ name: t.modlog_field_moderator, value: moderatorTag, inline: true });
  }

  return embed;
}
