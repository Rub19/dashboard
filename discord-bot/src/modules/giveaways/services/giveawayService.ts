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
import { baseEmbed } from '../../../utils/embeds.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation, SupportedLanguage } from '../../../utils/i18n.js';

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
    const language = guildConfigService.getConfig(data.guildId).language;
    const t = getTranslation(language);
    const endsAt = new Date(Date.now() + data.durationMinutes * 60 * 1000).toISOString();

    const giveaway = giveawayStorage.create({
      guildId: data.guildId,
      channelId: data.channelId,
      prize: data.prize,
      description: data.description || t.giveaway_default_description,
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
        const embed = this.buildGiveawayEmbed(giveaway, language);
        const row = this.buildActionRow(giveaway, language);
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
  public buildGiveawayEmbed(giveaway: Giveaway, language: SupportedLanguage = 'fr'): EmbedBuilder {
    const t = getTranslation(language);
    const endTimestamp = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);
    const isEnded = giveaway.status === 'ended';
    const isCancelled = giveaway.status === 'cancelled';

    // Ton de marque ETHONE selon l'état du giveaway (succès/erreur/info) plutôt que des
    // hex ad-hoc. Le timestamp reflète la date de fin (et non l'instant de rendu) : c'est
    // un choix volontaire pour un giveaway (compte à rebours), conservé tel quel.
    const tone = isEnded ? 'success' : isCancelled ? 'error' : 'info';
    const embed = baseEmbed(tone, {
      footerText: `ETHONE • ID: ${giveaway.id}`,
      timestamp: new Date(giveaway.endsAt),
    });

    if (isEnded) {
      const winnersStr =
        giveaway.winnerIds.length > 0
          ? giveaway.winnerIds.map((id) => `<@${id}>`).join(', ')
          : `*${t.giveaway_no_eligible_participant}*`;
      embed
        .setTitle(formatString(t.giveaway_embed_ended_title, { prize: giveaway.prize }))
        .setDescription(
          formatString(t.giveaway_embed_ended_desc, {
            winners: winnersStr,
            prize: giveaway.prize,
            count: giveaway.participants.length,
            hostId: giveaway.hostedById,
          })
        );
    } else if (isCancelled) {
      embed
        .setTitle(formatString(t.giveaway_embed_cancelled_title, { prize: giveaway.prize }))
        .setDescription(t.giveaway_embed_cancelled_desc);
    } else {
      let reqText = '';
      const req = giveaway.requirements;
      if (req.requiredRoleIds.length > 0) {
        reqText += formatString(t.giveaway_req_roles_required, { roles: req.requiredRoleIds.map((id) => `<@&${id}>`).join(' ') });
      }
      if (req.excludedRoleIds.length > 0) {
        reqText += formatString(t.giveaway_req_roles_excluded, { roles: req.excludedRoleIds.map((id) => `<@&${id}>`).join(' ') });
      }
      if (req.minAccountAgeDays > 0) {
        reqText += formatString(t.giveaway_req_min_age, { days: req.minAccountAgeDays });
      }
      if (req.minLevel > 0) {
        reqText += formatString(t.giveaway_req_min_level, { level: req.minLevel });
      }

      embed
        .setTitle(formatString(t.giveaway_embed_active_title, { prize: giveaway.prize }))
        .setDescription(
          formatString(t.giveaway_embed_active_desc, {
            description: giveaway.description,
            winnerCount: giveaway.winnerCount,
            endTimestamp,
            hostId: giveaway.hostedById,
            participantsCount: giveaway.participants.length,
          }) + (reqText ? t.giveaway_req_prefix + reqText : '')
        );
    }

    if (giveaway.bannerUrl) {
      embed.setImage(giveaway.bannerUrl);
    }

    return embed;
  }

  /**
   * Construit la ligne de boutons d'action
   */
  public buildActionRow(giveaway: Giveaway, language: SupportedLanguage = 'fr'): ActionRowBuilder<ButtonBuilder> {
    const t = getTranslation(language);
    const isEnded = giveaway.status === 'ended';
    const isCancelled = giveaway.status === 'cancelled';

    const enterButton = new ButtonBuilder()
      .setCustomId(`giveaway_enter:${giveaway.id}`)
      .setLabel(formatString(t.giveaway_btn_enter, { count: giveaway.participants.length }))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isEnded || isCancelled);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(enterButton);

    if (isEnded && giveaway.requireClaim) {
      const claimButton = new ButtonBuilder()
        .setCustomId(`giveaway_claim:${giveaway.id}`)
        .setLabel(t.giveaway_btn_claim)
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
    req: GiveawayRequirements,
    language: SupportedLanguage = 'fr'
  ): { eligible: boolean; reason?: string } {
    const t = getTranslation(language);

    // 1. Rôles interdits
    if (req.excludedRoleIds.length > 0) {
      const hasExcluded = member.roles.cache.some((r) => req.excludedRoleIds.includes(r.id));
      if (hasExcluded) {
        return {
          eligible: false,
          reason: t.giveaway_elig_excluded_role,
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
            reason: t.giveaway_elig_missing_all_roles,
          };
        }
      } else {
        const hasAny = req.requiredRoleIds.some((id) => member.roles.cache.has(id));
        if (!hasAny) {
          return {
            eligible: false,
            reason: t.giveaway_elig_missing_any_role,
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
          reason: formatString(t.giveaway_elig_min_age, { days: req.minAccountAgeDays }),
        };
      }
    }

    // 4. Niveau XP minimum (module Leveling)
    if (req.minLevel > 0) {
      const userLevel = xpWriteBuffer.getUser(member.guild.id, member.id).level;
      if (userLevel < req.minLevel) {
        return {
          eligible: false,
          reason: formatString(t.giveaway_elig_min_level, { level: req.minLevel, userLevel }),
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Gère le clic sur le bouton Participer
   */
  public async handleParticipation(interaction: ButtonInteraction, giveawayId: string): Promise<void> {
    const language = interaction.guildId ? guildConfigService.getConfig(interaction.guildId).language : 'fr';
    const t = getTranslation(language);

    const giveaway = giveawayStorage.getById(giveawayId);
    if (!giveaway || giveaway.status !== 'active') {
      await interaction.reply({
        embeds: [baseEmbed('error').setDescription(t.giveaway_not_active)],
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
      // Différer immédiatement : la mise à jour du message du giveaway ci-dessous édite un
      // message via l'API Discord et peut dépasser la fenêtre de 3s de l'interaction
      // ("Unknown interaction" / 10062) si on ne le fait pas.
      await interaction.deferReply({ ephemeral: true });
      await this.updateMessage(interaction.client, giveawayId);
      await interaction.editReply({
        embeds: [baseEmbed('info').setDescription(t.giveaway_left)],
      });
      return;
    }

    // Vérification d'éligibilité
    const eligibility = this.checkEligibility(member, giveaway.requirements, language);
    if (!eligibility.eligible) {
      await interaction.reply({
        embeds: [baseEmbed('error').setDescription(formatString(t.giveaway_participation_denied, { reason: eligibility.reason || '' }))],
        ephemeral: true,
      });
      return;
    }

    // Différer immédiatement : l'enregistrement + la mise à jour du message du giveaway ci-dessous
    // peuvent dépasser la fenêtre de 3s de l'interaction ("Unknown interaction" / 10062).
    await interaction.deferReply({ ephemeral: true });

    // Enregistrement
    giveawayStorage.addParticipant(giveawayId, {
      userId: member.id,
      username: member.user.username,
      avatarUrl: member.user.displayAvatarURL(),
      joinedAt: new Date().toISOString(),
      isEligible: true,
    });

    await this.updateMessage(interaction.client, giveawayId);

    await interaction.editReply({
      embeds: [baseEmbed('success').setDescription(t.giveaway_join_success)],
    });
  }

  /**
   * Met à jour le message Discord du giveaway
   */
  public async updateMessage(client: Client, giveawayId: string): Promise<void> {
    const giveaway = giveawayStorage.getById(giveawayId);
    if (!giveaway || !giveaway.messageId) return;

    try {
      const language = guildConfigService.getConfig(giveaway.guildId).language;
      const channel = client.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
      if (channel) {
        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (message) {
          const embed = this.buildGiveawayEmbed(giveaway, language);
          const row = this.buildActionRow(giveaway, language);
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

    const language = guildConfigService.getConfig(giveaway.guildId).language;
    const t = getTranslation(language);

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
        const elig = this.checkEligibility(member, giveaway.requirements, language);
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
          content: formatString(t.giveaway_announce_winners, { mentions, prize: giveaway.prize }),
        }).catch(() => {});
      } else {
        await channel.send({
          content: formatString(t.giveaway_announce_no_winner, { prize: giveaway.prize }),
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
          content: formatString(t.giveaway_dm_winner, { prize: giveaway.prize, guildName: guild.name }),
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
