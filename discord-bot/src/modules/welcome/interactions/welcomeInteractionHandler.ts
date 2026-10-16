import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import { VerificationService } from '../services/verificationService.js';
import { OnboardingService } from '../services/onboardingService.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { logger } from '../../../utils/logger.js';
import { baseEmbed, successEmbed, errorEmbed, infoEmbed } from '../../../utils/embeds.js';
import { trg } from '../../../utils/tr.js';

export class WelcomeInteractionHandler {
  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    const member = interaction.member as GuildMember;
    if (!member) return;

    // 1. Vérification
    if (customId.startsWith('welcome_verify:')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await VerificationService.verifyMember(member);
      const verifyEmbed = res.success
        ? successEmbed({ footerText: interaction.guild?.name || 'ETHONE Guard' })
        : errorEmbed({ footerText: interaction.guild?.name || 'ETHONE Guard' });
      await interaction.editReply({
        embeds: [
          verifyEmbed
            .setTitle(res.success ? trg(interaction, '✅ Vérification réussie !') : trg(interaction, '❌ Échec de la vérification'))
            .setDescription(res.message),
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

      // Ton "info" : c'est une simple consultation du règlement, pas une confirmation de
      // succès — le vert était utilisé ici par erreur (incohérence corrigée).
      const embed = infoEmbed({ footerText: 'Cliquez sur le bouton ci-dessous pour accepter le règlement.' })
        .setTitle(trg(guildId, '📜 Règlement de {name}', { name: interaction.guild?.name }))
        .setDescription(
          rulesList.map((r, i) => `**${i + 1}.** ${r.replace(/^\d+\.\s*/, '')}`).join('\n\n')
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`welcome_rules_accept:${guildId}`)
          .setLabel(trg(guildId, 'J’ai lu et j’accepte le règlement'))
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 3. Acceptation des Règles
    if (customId.startsWith('welcome_rules_accept:')) {
      welcomeRepository.recordEvent({
        guildId: member.guild.id,
        type: 'RULES_ACCEPTED',
        userId: member.id,
        userTag: member.user.tag,
        detail: 'Règlement accepté par le membre.',
      });

      // Différer immédiatement : la vérification automatique ci-dessous peut modifier les rôles
      // du membre via l'API Discord et dépasser la fenêtre de 3s de l'interaction
      // ("Unknown interaction" / 10062) si on ne le fait pas.
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Si vérification active, on vérifie automatiquement
      const verifRes = await VerificationService.verifyMember(member);

      await interaction.editReply({
        embeds: [
          successEmbed()
            .setTitle(trg(interaction, '✅ Règlement accepté avec succès !'))
            .setDescription(
              verifRes.success
                ? trg(interaction, 'Merci d’avoir accepté les règles ! Votre compte a été automatiquement vérifié et les salons sont débloqués.')
                : trg(interaction, 'Merci d’avoir accepté le règlement du serveur. Bienvenue parmi nous !')
            ),
        ],
      });
      return;
    }

    // 4. Choix de Rôle Onboarding
    if (customId.startsWith('welcome_role:')) {
      const roleId = customId.split(':')[1];
      if (!roleId) return;

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const res = await OnboardingService.handleRoleSelection(member, roleId);
        await interaction.editReply({
          embeds: [
            successEmbed()
              .setTitle(res.added ? trg(interaction, '🎭 Rôle attribué !') : trg(interaction, '🎭 Rôle retiré'))
              .setDescription(
                res.added
                  ? trg(interaction, 'Le rôle **@{roleName}** vous a été attribué avec succès.', { roleName: res.roleName })
                  : trg(interaction, 'Le rôle **@{roleName}** vous a été retiré.', { roleName: res.roleName })
              ),
          ],
        });
      } catch (err: any) {
        await interaction.editReply({
          embeds: [baseEmbed('error').setDescription(`❌ ${err.message || 'Impossible d’attribuer ce rôle.'}`)],
        });
      }
      return;
    }

    // 5. Redirection Salon
    if (customId.startsWith('welcome_channel:')) {
      const channelId = customId.split(':')[1];
      await interaction.reply({
        embeds: [baseEmbed('info').setDescription(trg(interaction, '📍 Rendez-vous dans le salon <#{channelId}> !', { channelId }))],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }
}
