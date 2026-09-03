import { ButtonInteraction } from 'discord.js';
import { giveawayService } from '../services/giveawayService.js';
import { giveawayStorage } from '../storage/giveawayStorage.js';

export async function handleGiveawayButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  if (customId.startsWith('giveaway_enter:')) {
    const giveawayId = customId.split(':')[1];
    await giveawayService.handleParticipation(interaction, giveawayId);
  } else if (customId.startsWith('giveaway_claim:')) {
    const giveawayId = customId.split(':')[1];
    const giveaway = giveawayStorage.getById(giveawayId);

    if (!giveaway || giveaway.status !== 'ended') {
      await interaction.reply({
        content: '❌ Ce tirage au sort n’est pas éligible à une réclamation.',
        ephemeral: true,
      });
      return;
    }

    if (!giveaway.winnerIds.includes(interaction.user.id)) {
      await interaction.reply({
        content: '⛔ Vous ne faites pas partie des gagnants sélectionnés pour ce lot.',
        ephemeral: true,
      });
      return;
    }

    if (giveaway.claimedWinnerIds.includes(interaction.user.id)) {
      await interaction.reply({
        content: '✅ Vous avez déjà confirmé la réclamation de votre récompense.',
        ephemeral: true,
      });
      return;
    }

    giveaway.claimedWinnerIds.push(interaction.user.id);
    giveawayStorage.update(giveaway.id, { claimedWinnerIds: giveaway.claimedWinnerIds });

    await interaction.reply({
      content: '🎉 **Réclamation confirmée !** Les organisateurs ont été notifiés de votre confirmation.',
      ephemeral: true,
    });
  }
}
