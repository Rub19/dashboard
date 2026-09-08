import { ButtonInteraction } from 'discord.js';
import { giveawayService } from '../services/giveawayService.js';
import { giveawayStorage } from '../storage/giveawayStorage.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { getTranslation } from '../../../utils/i18n.js';

export async function handleGiveawayButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  const t = getTranslation(interaction.guildId ? guildConfigService.getConfig(interaction.guildId).language : 'fr');

  if (customId.startsWith('giveaway_enter:')) {
    const giveawayId = customId.split(':')[1];
    await giveawayService.handleParticipation(interaction, giveawayId);
  } else if (customId.startsWith('giveaway_claim:')) {
    const giveawayId = customId.split(':')[1];
    const giveaway = giveawayStorage.getById(giveawayId);

    if (!giveaway || giveaway.status !== 'ended') {
      await interaction.reply({
        embeds: [baseEmbed('error').setDescription(t.giveaway_claim_not_eligible)],
        ephemeral: true,
      });
      return;
    }

    if (!giveaway.winnerIds.includes(interaction.user.id)) {
      await interaction.reply({
        embeds: [baseEmbed('error').setDescription(t.giveaway_claim_not_winner)],
        ephemeral: true,
      });
      return;
    }

    if (giveaway.claimedWinnerIds.includes(interaction.user.id)) {
      await interaction.reply({
        embeds: [baseEmbed('info').setDescription(t.giveaway_claim_already_done)],
        ephemeral: true,
      });
      return;
    }

    giveaway.claimedWinnerIds.push(interaction.user.id);
    giveawayStorage.update(giveaway.id, { claimedWinnerIds: giveaway.claimedWinnerIds });

    await interaction.reply({
      embeds: [baseEmbed('success').setDescription(t.giveaway_claim_success)],
      ephemeral: true,
    });
  }
}
