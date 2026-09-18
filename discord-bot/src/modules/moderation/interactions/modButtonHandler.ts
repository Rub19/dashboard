import { ButtonInteraction, MessageFlags } from 'discord.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { buildSanctionHistoryCard } from '../utils/sanctionCard.js';
import { V2_EPHEMERAL_FLAGS } from '../../../utils/components.js';

/** Bouton "Historique" sous une carte de sanction → casier du membre, éphémère. */
export async function handleModButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const [action, userId] = interaction.customId.replace('mod_btn_', '').split(':');
  if (action !== 'history' || !userId) {
    await interaction.reply({ content: 'Action inconnue.', flags: MessageFlags.Ephemeral });
    return;
  }
  const guildConfig = guildConfigService.getConfig(interaction.guildId);
  const sanctions = sanctionService.getUserSanctions(interaction.guildId, userId);
  const user = await interaction.client.users.fetch(userId).catch(() => null);
  await interaction.reply({
    components: [
      buildSanctionHistoryCard({
        guildConfig,
        targetTag: user?.tag || userId,
        targetId: userId,
        targetAvatarUrl: user?.displayAvatarURL() || null,
        sanctions,
      }),
    ],
    flags: V2_EPHEMERAL_FLAGS,
  });
}
