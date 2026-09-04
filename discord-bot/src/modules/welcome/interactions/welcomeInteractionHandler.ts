import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { VerificationService } from '../services/verificationService.js';
import { OnboardingService } from '../services/onboardingService.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { logger } from '../../../utils/logger.js';

export class WelcomeInteractionHandler {
  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    const member = interaction.member as GuildMember;
    if (!member) return;

    // 1. Vérification
    if (customId.startsWith('welcome_verify:')) {
      await interaction.deferReply({ ephemeral: true });
      const res = await VerificationService.verifyMember(member);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(res.success ? 0x10b981 : 0xef4444)
            .setTitle(res.success ? '✅ Vérification réussie !' : '❌ Échec de la vérification')
            .setDescription(res.message)
            .setFooter({ text: interaction.guild?.name || 'ETHONE Guard' }),
        ],
      });
      return;
    }

    // 2. Consultation des Règles
    if (customId.startsWith('welcome_rules:')) {
      const guildId = customId.split(':')[1] || interaction.guildId;
      const flow = welcomeRepository.getOnboardingFlow(guildId!);
      const rulesStep = flow.steps.find((s) => s.type === 'RULES');

      const rulesList = rulesStep?.rulesList || [
        '1. Respecter tous les membres et l’équipe d’administration.',
        '2. Aucun propos diffamatoire, discriminatoire ou illicite.',
        '3. Pas de spam, autopromotion non autorisée ou liens suspects.',
      ];

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle(`📜 Règlement de ${interaction.guild?.name}`)
        .setDescription(
          rulesList.map((r, i) => `**${i + 1}.** ${r.replace(/^\d+\.\s*/, '')}`).join('\n\n')
        )
        .setFooter({ text: 'Cliquez sur le bouton ci-dessous pour accepter le règlement.' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`welcome_rules_accept:${guildId}`)
          .setLabel('J’ai lu et j’accepte le règlement')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
      return;
    }

    // 3. Acceptation des Règles
    if (customId.startsWith('welcome_rules_accept:')) {
      welcomeRepository.recordEvent({
        type: 'RULES_ACCEPTED',
        userId: member.id,
        userTag: member.user.tag,
        detail: 'Règlement accepté par le membre.',
      });

      // Si vérification active, on vérifie automatiquement
      const verifRes = await VerificationService.verifyMember(member);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('✅ Règlement accepté avec succès !')
            .setDescription(
              verifRes.success
                ? 'Merci d’avoir accepté les règles ! Votre compte a été automatiquement vérifié et les salons sont débloqués.'
                : 'Merci d’avoir accepté le règlement du serveur. Bienvenue parmi nous !'
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    // 4. Choix de Rôle Onboarding
    if (customId.startsWith('welcome_role:')) {
      const roleId = customId.split(':')[1];
      if (!roleId) return;

      try {
        await interaction.deferReply({ ephemeral: true });
        const res = await OnboardingService.handleRoleSelection(member, roleId);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x10b981)
              .setTitle(res.added ? '🎭 Rôle attribué !' : '🎭 Rôle retiré')
              .setDescription(
                res.added
                  ? `Le rôle **@${res.roleName}** vous a été attribué avec succès.`
                  : `Le rôle **@${res.roleName}** vous a été retiré.`
              ),
          ],
        });
      } catch (err: any) {
        await interaction.editReply({
          content: `❌ ${err.message || 'Impossible d’attribuer ce rôle.'}`,
        });
      }
      return;
    }

    // 5. Redirection Salon
    if (customId.startsWith('welcome_channel:')) {
      const channelId = customId.split(':')[1];
      await interaction.reply({
        content: `📍 Rendez-vous dans le salon <#${channelId}> !`,
        ephemeral: true,
      });
      return;
    }
  }
}
