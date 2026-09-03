import { ButtonInteraction, GuildMember, StringSelectMenuInteraction } from 'discord.js';
import { rolePanelService } from '../services/rolePanelService.js';
import { logger } from '../../../utils/logger.js';

export async function handleRoleButton(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;

  const panelId = parts[1];
  const itemId = parts[2];
  const member = interaction.member as GuildMember | null;

  if (!member) {
    await interaction.reply({ content: '❌ Erreur de récupération du membre.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const res = await rolePanelService.handleRoleAction(member, panelId, itemId);
    await interaction.editReply({ content: res.message });
  } catch (err: any) {
    logger.error('Erreur handleRoleButton :', err);
    await interaction.editReply({ content: `❌ ${err.message || 'Erreur lors de la mise à jour des rôles.'}` });
  }
}

export async function handleRoleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 2) return;

  const panelId = parts[1];
  const member = interaction.member as GuildMember | null;

  if (!member) {
    await interaction.reply({ content: '❌ Erreur de récupération du membre.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const selectedItemIds = interaction.values;
    const panel = rolePanelService.getPanel(interaction.guildId!, panelId);

    if (!panel) {
      await interaction.editReply({ content: '❌ Panneau de rôles introuvable.' });
      return;
    }

    const messages: string[] = [];
    for (const itemId of selectedItemIds) {
      const res = await rolePanelService.handleRoleAction(member, panelId, itemId);
      messages.push(res.message);
    }

    await interaction.editReply({
      content: messages.length > 0 ? messages.join('\n') : '✅ Vos rôles ont été mis à jour.',
    });
  } catch (err: any) {
    logger.error('Erreur handleRoleSelect :', err);
    await interaction.editReply({ content: `❌ ${err.message || 'Erreur lors de la mise à jour des rôles.'}` });
  }
}
