import { ButtonInteraction, MessageFlags } from 'discord.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { buildSanctionCard, buildSanctionHistoryCard, casesToHistory, type HistoryEntry } from '../utils/sanctionCard.js';
import { V2_EPHEMERAL_FLAGS, V2_FLAGS } from '../../../utils/components.js';
import { noticeEmbed } from '../../../utils/embeds.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { CaseService } from '../services/caseService.js';
import { ACTION_LABEL } from '../services/sanctionPipeline.js';

/** Dossiers du membre, plus les anciennes sanctions enregistrées avant les dossiers numérotés. */
export function memberHistory(guildId: string, userId: string): HistoryEntry[] {
  const legacy: HistoryEntry[] = sanctionService
    .getUserSanctions(guildId, userId)
    .map((s) => ({ id: s.id, type: s.type, reason: s.reason, timestamp: s.timestamp, moderatorTag: s.moderatorTag, open: s.active }));
  return [...casesToHistory(moderationRepository.getUserCases(guildId, userId)), ...legacy].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** Boutons sous une carte de sanction : Historique, Annuler (10 s, modérateur seulement) et Afficher. */
export async function handleModButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;
  const id = interaction.customId;

  if (id.startsWith('sanc_undo:')) {
    const [, num, modId, until] = id.split(':');
    if (interaction.user.id !== modId) {
      await interaction.reply({ embeds: [noticeEmbed('denied', 'Seul le modérateur qui a sanctionné peut annuler.')], flags: MessageFlags.Ephemeral });
      return;
    }
    if (Date.now() / 1000 > Number(until)) {
      await interaction.reply({ embeds: [noticeEmbed('info', 'Les 10 secondes pour annuler sont passées : lève la sanction depuis le dossier.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const res = CaseService.revertCase(interaction.client, guildId, Number(num), { id: interaction.user.id, tag: interaction.user.tag }, 'Annulée par le modérateur');
    await interaction.reply({ embeds: [noticeEmbed(res.success ? 'success' : 'error', res.success ? `Dossier n°${num} annulé.` : res.error ?? 'Annulation impossible.')], flags: MessageFlags.Ephemeral });
    return;
  }

  if (id.startsWith('sanc_show:')) {
    const c = moderationRepository.getCaseByNumber(guildId, Number(id.split(':')[1]));
    if (!c || !interaction.channel?.isSendable()) {
      await interaction.reply({ embeds: [noticeEmbed('error', 'Dossier introuvable.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const user = await interaction.client.users.fetch(c.userId).catch(() => null);
    await interaction.channel.send({
      components: [
        buildSanctionCard({
          guildConfig: guildConfigService.getConfig(guildId),
          type: { WARN: 'warn', TIMEOUT: 'timeout', UNTIMEOUT: 'untimeout', KICK: 'kick', BAN: 'ban', TEMPBAN: 'ban', UNBAN: 'unban', NOTE: 'note' }[c.action as string] ?? 'warn',
          label: ACTION_LABEL[c.action],
          sanctionId: c.caseNumber,
          targetTag: c.userTag,
          targetMention: `<@${c.userId}>`,
          targetAvatarUrl: user?.displayAvatarURL() ?? null,
          moderatorMention: `<@${c.moderatorId}>`,
          reason: c.reason,
          durationSeconds: c.action === 'WARN' ? null : c.durationSeconds,
        }),
      ],
      flags: V2_FLAGS,
      allowedMentions: { parse: [] },
    });
    await interaction.reply({ embeds: [noticeEmbed('success', 'Sanction affichée dans le salon.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const [action, userId] = id.replace('mod_btn_', '').split(':');
  if (action !== 'history' || !userId) {
    await interaction.reply({ embeds: [noticeEmbed('error', 'Action inconnue.')], flags: MessageFlags.Ephemeral });
    return;
  }
  const user = await interaction.client.users.fetch(userId).catch(() => null);
  await interaction.reply({
    components: [
      buildSanctionHistoryCard({
        guildConfig: guildConfigService.getConfig(guildId),
        targetTag: user?.tag || userId,
        targetId: userId,
        targetAvatarUrl: user?.displayAvatarURL() || null,
        sanctions: memberHistory(guildId, userId),
      }),
    ],
    flags: V2_EPHEMERAL_FLAGS,
  });
}
