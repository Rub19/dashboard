import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { Giveaway, GiveawayRequirements } from '../types/giveaway.js';
import { giveawayStorage } from '../storage/giveawayStorage.js';
import { xpWriteBuffer } from '../../leveling/storage/xpWriteBuffer.js';
import { logService } from '../../logs/services/logService.js';
import { giveawayScheduler } from './giveawayScheduler.js';
import { logger } from '../../../utils/logger.js';

class GiveawayService {
  /**
   * Crée un nouveau giveaway et publie l'embed avec bouton sur Discord
   */
  public async createGiveaway(
    client: Client,
    data: {
      guildId: string;
      channelId: string;
      prize: string;
      description?: string;
      winnerCount: number;
      durationMinutes: number;
      rewardRoleId?: string | null;
      bannerUrl?: string | null;
      hostedById: string;
      hostedByTag: string;
      requirements?: Partial<GiveawayRequirements>;
      requireClaim?: boolean;
      claimTimeoutHours?: number;
    }
  ): Promise<Giveaway> {
    const endsAt = new Date(Date.now() + data.durationMinutes * 60 * 1000).toISOString();

    const giveaway = giveawayStorage.create({
      guildId: data.guildId,
      channelId: data.channelId,
      prize: data.prize,
      description: data.description || 'Cliquez sur le bouton ci-dessous pour participer au tirage au sort !',
      winnerCount: data.winnerCount,
      rewardRoleId: data.rewardRoleId || null,
      bannerUrl: data.bannerUrl || null,
      endsAt,
      hostedById: data.hostedById,
      hostedByTag: data.hostedByTag,
      requirements: {
        requiredRoleIds: data.requirements?.requiredRoleIds || [],
        roleMode: data.requirements?.roleMode || 'any',
        excludedRoleIds: data.requirements?.excludedRoleIds || [],
        minAccountAgeDays: data.requirements?.minAccountAgeDays || 0,
        minLevel: data.requirements?.minLevel || 0,
      },
      requireClaim: data.requireClaim || false,
      claimTimeoutHours: data.claimTimeoutHours || 24,
      status: 'active',
    });

    // Envoi du message sur Discord
    try {
      const channel = client.channels.cache.get(data.channelId) as TextChannel | undefined;
      if (channel && channel.type === ChannelType.GuildText) {
        const embed = this.buildGiveawayEmbed(giveaway);
        const row = this.buildActionRow(giveaway);
        const message = await channel.send({ embeds: [embed], components: [row] });

        giveaway.messageId = message.id;
        giveawayStorage.update(giveaway.id, { messageId: message.id });
      }
    } catch (err) {
      logger.error('Erreur lors de l’envoi de l’embed de giveaway :', err);
    }

    // Planification automatique de la fin du tirage
    giveawayScheduler.schedule(giveaway, client);

    // Enregistrement dans les logs
    const guild = client.guilds.cache.get(data.guildId);
    if (guild) {
      await logService.log(guild, {
        category: 'server',
        type: 'SERVER_UPDATE',
        title: '🎁 Nouveau Giveaway Lancé',
        description: `Un giveaway pour **${giveaway.prize}** a été lancé par <@${data.hostedById}>.`,
        color: '#6366F1',
        userId: data.hostedById,
        userTag: data.hostedByTag,
        fields: [
          { name: 'Lot', value: giveaway.prize, inline: true },
          { name: 'Gagnants', value: `${giveaway.winnerCount}`, inline: true },
          { name: 'Salon', value: `<#${giveaway.channelId}>`, inline: true },
          { name: 'Fin', value: `<t:${Math.floor(new Date(endsAt).getTime() / 1000)}:R>`, inline: true },
        ],
      });
    }

    return giveaway;
  }

  /**
   * Construit l'embed visuel du giveaway Discord
   */
  public buildGiveawayEmbed(giveaway: Giveaway): EmbedBuilder {
    const endTimestamp = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);
    const isEnded = giveaway.status === 'ended';
    const isCancelled = giveaway.status === 'cancelled';

    const embed = new EmbedBuilder();

    if (isEnded) {
      embed
        .setColor('#10B981')
        .setTitle(`🎉 GIVEAWAY TERMINÉ : ${giveaway.prize}`)
        .setDescription(
          `Ce tirage au sort est désormais clôturé.\n\n` +
            `🏆 **Gagnant(s) :** ${
              giveaway.winnerIds.length > 0
                ? giveaway.winnerIds.map((id) => `<@${id}>`).join(', ')
                : '*Aucun participant éligible.*'
            }\n\n` +
            `🎁 **Lot remporté :** ${giveaway.prize}\n` +
            `👥 **Participants au total :** \`${giveaway.participants.length}\`\n` +
            `👤 **Organisé par :** <@${giveaway.hostedById}>`
        );
    } else if (isCancelled) {
      embed
        .setColor('#EF4444')
        .setTitle(`❌ GIVEAWAY ANNULÉ : ${giveaway.prize}`)
        .setDescription(`Ce giveaway a été annulé par un administrateur.`);
    } else {
      let reqText = '';
      const req = giveaway.requirements;
      if (req.requiredRoleIds.length > 0) {
        reqText += `\n• Rôle(s) requis : ${req.requiredRoleIds.map((id) => `<@&${id}>`).join(' ')}`;
      }
      if (req.excludedRoleIds.length > 0) {
        reqText += `\n• Rôle(s) interdit(s) : ${req.excludedRoleIds.map((id) => `<@&${id}>`).join(' ')}`;
      }
      if (req.minAccountAgeDays > 0) {
        reqText += `\n• Âge de compte minimum : \`${req.minAccountAgeDays} jour(s)\``;
      }
      if (req.minLevel > 0) {
        reqText += `\n• Niveau XP minimum : \`Niveau ${req.minLevel}\``;
      }

      embed
        .setColor('#6366F1')
        .setTitle(`🎁 GIVEAWAY : ${giveaway.prize}`)
        .setDescription(
          `${giveaway.description}\n\n` +
            `🏆 **Gagnants :** \`${giveaway.winnerCount}\`\n` +
            `⏰ **Fin :** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)\n` +
            `👤 **Organisé par :** <@${giveaway.hostedById}>\n` +
            `👥 **Participants :** \`${giveaway.participants.length}\`` +
            (reqText ? `\n\n🛡️ **Conditions d'accès :**${reqText}` : '')
        );
    }

    if (giveaway.bannerUrl) {
      embed.setImage(giveaway.bannerUrl);
    }

    embed.setFooter({ text: `ID: ${giveaway.id}` }).setTimestamp(new Date(giveaway.endsAt));
    return embed;
  }

  /**
   * Construit la ligne de boutons d'action
   */
  public buildActionRow(giveaway: Giveaway): ActionRowBuilder<ButtonBuilder> {
    const isEnded = giveaway.status === 'ended';
    const isCancelled = giveaway.status === 'cancelled';

    const enterButton = new ButtonBuilder()
      .setCustomId(`giveaway_enter:${giveaway.id}`)
      .setLabel(`🎉 Participer (${giveaway.participants.length})`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isEnded || isCancelled);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(enterButton);

    if (isEnded && giveaway.requireClaim) {
      const claimButton = new ButtonBuilder()
        .setCustomId(`giveaway_claim:${giveaway.id}`)
        .setLabel('🎁 Réclamer mon lot')
        .setStyle(ButtonStyle.Success);
      row.addComponents(claimButton);
    }

    return row;
  }

  /**
   * Vérifie l'éligibilité d'un membre face aux conditions
   */
  public checkEligibility(
    member: GuildMember,
    req: GiveawayRequirements
  ): { eligible: boolean; reason?: string } {
    // 1. Rôles interdits
    if (req.excludedRoleIds.length > 0) {
      const hasExcluded = member.roles.cache.some((r) => req.excludedRoleIds.includes(r.id));
      if (hasExcluded) {
        return {
          eligible: false,
          reason: 'Vous possédez un rôle exclu du tirage au sort.',
        };
      }
    }

    // 2. Rôles requis
    if (req.requiredRoleIds.length > 0) {
      if (req.roleMode === 'all') {
        const hasAll = req.requiredRoleIds.every((id) => member.roles.cache.has(id));
        if (!hasAll) {
          return {
            eligible: false,
            reason: 'Vous ne possédez pas tous les rôles obligatoires pour participer.',
          };
        }
      } else {
        const hasAny = req.requiredRoleIds.some((id) => member.roles.cache.has(id));
        if (!hasAny) {
          return {
            eligible: false,
            reason: 'Vous ne possédez aucun des rôles requis pour participer.',
          };
        }
      }
    }

    // 3. Âge du compte
    if (req.minAccountAgeDays > 0) {
      const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < req.minAccountAgeDays) {
        return {
          eligible: false,
          reason: `Votre compte Discord doit avoir au moins ${req.minAccountAgeDays} jour(s) d'ancienneté.`,
        };
      }
    }

    // 4. Niveau XP minimum (module Leveling)
    if (req.minLevel > 0) {
      const userLevel = xpWriteBuffer.getUser(member.guild.id, member.id).level;
      if (userLevel < req.minLevel) {
        return {
          eligible: false,
          reason: `Vous devez avoir atteint au minimum le **Niveau ${req.minLevel}** (Niveau actuel : ${userLevel}).`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Gère le clic sur le bouton Participer
   */
  public async handleParticipation(interaction: ButtonInteraction, giveawayId: string): Promise<void> {
    const giveaway = giveawayStorage.getById(giveawayId);
    if (!giveaway || giveaway.status !== 'active') {
      await interaction.reply({
        content: '❌ Ce giveaway n’est plus actif.',
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member) return;

    // Déjà participant ? Retrait (Toggle)
    const isAlready = giveaway.participants.some((p) => p.userId === member.id);
    if (isAlready) {
      giveawayStorage.removeParticipant(giveawayId, member.id);
      await this.updateMessage(interaction.client, giveawayId);
      await interaction.reply({
        content: '👋 Vous ne participez plus à ce giveaway.',
        ephemeral: true,
      });
      return;
    }

    // Vérification d'éligibilité
    const eligibility = this.checkEligibility(member, giveaway.requirements);
    if (!eligibility.eligible) {
      await interaction.reply({
        content: `⛔ **Participation refusée :**\n${eligibility.reason}`,
        ephemeral: true,
      });
      return;
    }

    // Enregistrement
    giveawayStorage.addParticipant(giveawayId, {
      userId: member.id,
      username: member.user.username,
      avatarUrl: member.user.displayAvatarURL(),
      joinedAt: new Date().toISOString(),
      isEligible: true,
    });

    await this.updateMessage(interaction.client, giveawayId);

    await interaction.reply({
      content: '🎉 **Félicitations !** Votre participation au tirage au sort a bien été enregistrée.',
      ephemeral: true,
    });
  }

  /**
   * Met à jour le message Discord du giveaway
   */
  public async updateMessage(client: Client, giveawayId: string): Promise<void> {
    const giveaway = giveawayStorage.getById(giveawayId);
    if (!giveaway || !giveaway.messageId) return;

    try {
      const channel = client.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
      if (channel) {
        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (message) {
          const embed = this.buildGiveawayEmbed(giveaway);
          const row = this.buildActionRow(giveaway);
          await message.edit({ embeds: [embed], components: [row] });
        }
      }
    } catch (err) {
      logger.error('Erreur mise à jour message giveaway :', err);
    }
  }

  /**
   * Effectue le tirage au sort des gagnants
   */
  public async drawWinners(giveawayId: string, client: Client, isReroll = false, count?: number): Promise<string[]> {
    const giveaway = giveawayStorage.getById(giveawayId);
    if (!giveaway) return [];

    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return [];

    // Participants éligibles actuels
    const winnersNeeded = count || giveaway.winnerCount;
    const pool = giveaway.participants.filter(
      (p) => !isReroll || !giveaway.winnerIds.includes(p.userId)
    );

    // Vérifier qui est encore présent sur le serveur et éligible
    const validCandidateIds: string[] = [];
    for (const p of pool) {
      const member = await guild.members.fetch(p.userId).catch(() => null);
      if (member) {
        const elig = this.checkEligibility(member, giveaway.requirements);
        if (elig.eligible) {
          validCandidateIds.push(p.userId);
        }
      }
    }

    // Tirage aléatoire sans doublon
    const selectedWinners: string[] = [];
    const candidates = [...validCandidateIds];

    while (selectedWinners.length < winnersNeeded && candidates.length > 0) {
      const randIdx = Math.floor(Math.random() * candidates.length);
      selectedWinners.push(candidates[randIdx]);
      candidates.splice(randIdx, 1);
    }

    if (!isReroll) {
      giveaway.status = 'ended';
      giveaway.winnerIds = selectedWinners;
      giveawayStorage.update(giveaway.id, {
        status: 'ended',
        winnerIds: selectedWinners,
      });
    } else {
      giveaway.rerollHistory.push({
        date: new Date().toISOString(),
        previousWinnerIds: [...giveaway.winnerIds],
        newWinnerIds: selectedWinners,
      });
      giveaway.winnerIds = selectedWinners;
      giveawayStorage.update(giveaway.id, {
        winnerIds: selectedWinners,
        rerollHistory: giveaway.rerollHistory,
      });
    }

    // Mise à jour de l'embed
    await this.updateMessage(client, giveawayId);

    // Annonce dans le salon
    const channel = guild.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
    if (channel) {
      if (selectedWinners.length > 0) {
        const mentions = selectedWinners.map((id) => `<@${id}>`).join(' ');
        await channel.send({
          content: `🎉 Félicitations ${mentions} ! Vous avez remporté le giveaway pour **${giveaway.prize}** ! 🎁`,
        }).catch(() => {});
      } else {
        await channel.send({
          content: `⚠️ Aucun gagnant n'a pu être sélectionné pour le giveaway **${giveaway.prize}** (aucun participant éligible).`,
        }).catch(() => {});
      }
    }

    // Attribution automatique du rôle récompense si configuré
    if (giveaway.rewardRoleId && selectedWinners.length > 0) {
      const botMember = guild.members.me;
      const canManage = botMember && botMember.permissions.has(PermissionFlagsBits.ManageRoles);
      const botHighest = botMember ? botMember.roles.highest.position : 0;
      const role = guild.roles.cache.get(giveaway.rewardRoleId);

      if (canManage && role && role.position < botHighest) {
        for (const wId of selectedWinners) {
          const m = await guild.members.fetch(wId).catch(() => null);
          if (m) {
            await m.roles.add(role, `Récompense remportée lors du giveaway : ${giveaway.prize}`).catch(() => {});
          }
        }
      }
    }

    // Notification privée en DM
    for (const wId of selectedWinners) {
      const m = await guild.members.fetch(wId).catch(() => null);
      if (m) {
        await m.send({
          content: `🎉 **Félicitations !** Vous avez remporté le giveaway **${giveaway.prize}** sur le serveur **${guild.name}** !`,
        }).catch(() => {});
      }
    }

    return selectedWinners;
  }

  /**
   * Termine manuellement un giveaway
   */
  public async endGiveawayManual(giveawayId: string, client: Client): Promise<string[]> {
    giveawayScheduler.cancel(giveawayId);
    return await this.drawWinners(giveawayId, client, false);
  }

  /**
   * Reroll d'un ou plusieurs gagnants
   */
  public async reroll(giveawayId: string, client: Client, count = 1): Promise<string[]> {
    return await this.drawWinners(giveawayId, client, true, count);
  }

  /**
   * Annule un giveaway
   */
  public async cancelGiveaway(giveawayId: string, client: Client): Promise<boolean> {
    giveawayScheduler.cancel(giveawayId);
    const updated = giveawayStorage.update(giveawayId, { status: 'cancelled' });
    if (!updated) return false;

    await this.updateMessage(client, giveawayId);
    return true;
  }

  /**
   * Prolonge la durée d'un giveaway
   */
  public async extendGiveaway(giveawayId: string, additionalMinutes: number, client: Client): Promise<boolean> {
    const gw = giveawayStorage.getById(giveawayId);
    if (!gw || gw.status !== 'active') return false;

    const currentEnd = new Date(gw.endsAt).getTime();
    const newEnd = new Date(currentEnd + additionalMinutes * 60 * 1000).toISOString();

    giveawayStorage.update(giveawayId, { endsAt: newEnd });
    giveawayScheduler.cancel(giveawayId);
    giveawayScheduler.schedule({ ...gw, endsAt: newEnd }, client);

    await this.updateMessage(client, giveawayId);
    return true;
  }
}

export const giveawayService = new GiveawayService();
