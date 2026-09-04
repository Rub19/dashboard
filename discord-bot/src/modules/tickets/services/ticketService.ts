import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
  User,
} from 'discord.js';
import { Ticket, TicketPriority, TicketStatus } from '../types/ticket.js';
import { TicketCategory } from '../types/category.js';
import { TicketGlobalConfig, TicketPanel } from '../types/panel.js';
import { TicketTeam } from '../types/team.js';
import { TicketAutomationRule } from '../types/automation.js';
import { ticketRepository, TicketQueryOptions } from '../storage/ticketRepository.js';
import { TranscriptService } from './transcriptService.js';
import { TicketAutomationEngine } from './ticketAutomationEngine.js';
import { TicketScheduler } from './ticketScheduler.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

class TicketService {
  private discordClient: Client | null = null;
  // Verrou anti-double clic
  private creatingUsers = new Set<string>();

  public initialize(client: Client): void {
    this.discordClient = client;
    TicketScheduler.start(client);
    logger.info('[TicketService] Tickets Center 2.0 Engine initialisé.');
  }

  // --- Création de Ticket ---

  public async createTicket(
    guild: Guild,
    user: User,
    categoryId: string,
    formAnswers: Record<string, any> = {}
  ): Promise<Ticket> {
    const lockKey = `${guild.id}-${user.id}`;
    if (this.creatingUsers.has(lockKey)) {
      throw new Error('Une création de ticket est déjà en cours pour votre compte.');
    }
    this.creatingUsers.add(lockKey);

    try {
      const config = ticketRepository.getConfig(guild.id);
      if (!config.enabled) {
        throw new Error('Le système de tickets est temporairement désactivé sur ce serveur.');
      }

      const category = ticketRepository.getCategories(guild.id).find((c) => c.id === categoryId);
      if (!category) {
        throw new Error('Catégorie de ticket introuvable.');
      }

      // Vérification anti-doublon et limite de tickets ouverts
      const openUserTickets = ticketRepository
        .getTickets(guild.id, { userId: user.id })
        .tickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED');

      const maxAllowed = category.maxTicketsPerUser ?? config.maxOpenTicketsPerUser ?? 1;
      if (openUserTickets.length >= maxAllowed) {
        throw new Error(
          `Vous avez déjà ${openUserTickets.length} ticket(s) ouvert(s). Veuillez fermer vos demandes en cours.`
        );
      }

      // Génération de l'identifiant séquentiel / unique
      const totalTickets = ticketRepository.getOverview(guild.id).totalTickets + 1;
      const ticketId = `TICKET-${totalTickets.toString().padStart(4, '0')}`;

      // Détermination du nom de salon
      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const channelName = (config.namingFormat || 'ticket-{username}')
        .replace('{username}', cleanUsername)
        .replace('{id}', totalTickets.toString())
        .replace('{ticketId}', ticketId)
        .slice(0, 32);

      // Calcul des permissions du salon
      const permissionOverwrites: any[] = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: guild.members.me!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ];

      // Ajout des rôles staff configurés
      if (category.supportRoleIds && category.supportRoleIds.length > 0) {
        for (const roleId of category.supportRoleIds) {
          permissionOverwrites.push({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }
      }

      // Ajout des rôles d'équipe si une équipe est assignée
      if (category.assignedTeamId) {
        const team = ticketRepository.getTeams(guild.id).find((t) => t.id === category.assignedTeamId);
        if (team && team.roleIds) {
          for (const roleId of team.roleIds) {
            if (!permissionOverwrites.some((po) => po.id === roleId)) {
              permissionOverwrites.push({
                id: roleId,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              });
            }
          }
        }
      }

      // Création du salon Discord
      const parentId = category.discordCategoryId || undefined;
      const channel = await guild.channels.create({
        name: `🎫・${channelName}`,
        type: ChannelType.GuildText,
        parent: parentId,
        permissionOverwrites,
        topic: `Ticket ${ticketId} • Demandeur : ${user.tag} (${user.id}) • Catégorie : ${category.name}`,
      });

      const now = new Date().toISOString();

      // Création de l'objet Ticket
      let ticket: Ticket = {
        id: ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: user.id,
        userTag: user.tag,
        userAvatar: user.displayAvatarURL(),
        categoryId: category.id,
        categoryName: category.name,
        priority: category.defaultPriority || 'NORMAL',
        status: 'OPEN',
        claimedBy: null,
        assignedTeamId: category.assignedTeamId || null,
        tags: [],
        answers: formAnswers,
        notes: [],
        activityTimeline: [
          {
            id: `act-${Date.now()}`,
            type: 'CREATED',
            actorTag: user.tag,
            description: `Création du ticket dans la catégorie ${category.name}`,
            timestamp: now,
          },
        ],
        relatedCaseId: null,
        rating: null,
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
        closedAt: null,
        closedBy: null,
        closeReason: null,
        transcriptPath: null,
        transcriptUrl: null,
      };

      // Sauvegarde
      ticketRepository.saveTicket(ticket);

      // Envoi du message de bienvenue et panel de contrôles
      await this.sendTicketChannelPanel(channel, ticket, category, user);

      // Exécution des règles d'automatisation
      ticket = await TicketAutomationEngine.executeTrigger(this.discordClient, 'TICKET_CREATED', ticket);

      // Journalisation dans l'Audit Center 2.0
      logService.emit({
        guildId: guild.id,
        module: 'SYSTEM',
        type: 'TICKET_CREATE',
        actor: {
          id: user.id,
          tag: user.tag,
          avatar: user.displayAvatarURL(),
        },
        target: {
          id: channel.id,
          type: 'CHANNEL',
          name: channel.name,
        },
        channel: {
          id: channel.id,
          name: channel.name,
        },
        reason: `Ouverture du ticket ${ticket.id} (${category.name})`,
        metadata: {
          ticketId: ticket.id,
          categoryId: category.id,
          priority: ticket.priority,
        },
      });

      return ticket;
    } finally {
      this.creatingUsers.delete(lockKey);
    }
  }

  // --- Envoi du panel interactif dans le salon Discord ---

  private async sendTicketChannelPanel(
    channel: TextChannel,
    ticket: Ticket,
    category: TicketCategory,
    user: User
  ): Promise<void> {
    const welcomeTemplate =
      category.welcomeMessage ||
      'Bonjour {user} ! Merci d’avoir contacté l’équipe d’assistance.\nUn membre du support va prendre en charge votre demande #{ticketId} sous peu.';

    const renderedWelcome = welcomeTemplate
      .replace('{user}', `<@${user.id}>`)
      .replace('{username}', user.username)
      .replace('{ticketId}', ticket.id)
      .replace('{category}', category.name)
      .replace('{team}', category.assignedTeamId || 'Support')
      .replace('{server}', channel.guild.name);

    const embed = new EmbedBuilder()
      .setColor(category.color as `#${string}` || '#5865F2')
      .setTitle(`${category.emoji} ${ticket.id} • ${category.name}`)
      .setDescription(renderedWelcome)
      .addFields(
        { name: '👤 Demandeur', value: `<@${user.id}> (${user.tag})`, inline: true },
        { name: '🚦 Priorité', value: `\`${ticket.priority}\``, inline: true },
        { name: '📌 Statut', value: `\`${ticket.status}\``, inline: true }
      );

    // Form answers si disponibles
    if (ticket.answers && Object.keys(ticket.answers).length > 0) {
      const answersText = Object.entries(ticket.answers)
        .map(([k, v]) => `**${k}** : ${v}`)
        .join('\n');
      embed.addFields({
        name: '📋 Réponses au formulaire',
        value: answersText.slice(0, 1024),
        inline: false,
      });
    }

    embed.setFooter({
      text: `ETHONE Helpdesk 2.0 • Utilisez les boutons ci-dessous pour gérer ce ticket.`,
    });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close:${ticket.id}`)
        .setLabel('Fermer')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket_claim:${ticket.id}`)
        .setLabel('Prendre en charge')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ticket_priority:${ticket.id}`)
        .setLabel('Priorité')
        .setEmoji('📌')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket_transcript:${ticket.id}`)
        .setLabel('Transcript')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: `<@${user.id}>`,
      embeds: [embed],
      components: [row1],
    });
  }

  // --- Gestion du Cycle de Vie ---

  public async claimTicket(
    guildId: string,
    ticketId: string,
    staffUser: { id: string; tag: string; avatar?: string | null }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.claimedBy = staffUser;
    ticket.status = 'WAITING_USER';
    ticket.updatedAt = new Date().toISOString();
    ticket.lastActivityAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'CLAIMED',
      actorTag: staffUser.tag,
      description: `Prise en charge du ticket par ${staffUser.tag}`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);

    // Notification Discord dans le salon
    if (this.discordClient) {
      try {
        const guild = this.discordClient.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(ticket.channelId) as TextChannel | undefined;
        if (channel) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x3b82f6)
                .setDescription(`🙋 **${staffUser.tag}** a pris en charge ce ticket.`),
            ],
          });
        }
      } catch {}
    }

    logService.emit({
      guildId,
      module: 'SYSTEM',
      type: 'TICKET_CLAIM',
      actor: { id: staffUser.id, tag: staffUser.tag },
      target: { id: ticket.id, type: 'CASE', name: ticket.id },
      reason: `Prise en charge par ${staffUser.tag}`,
    });

    return ticket;
  }

  public async unclaimTicket(
    guildId: string,
    ticketId: string,
    staffUser: { id: string; tag: string }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.claimedBy = null;
    ticket.status = 'OPEN';
    ticket.updatedAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'UNCLAIMED',
      actorTag: staffUser.tag,
      description: `Abandon de la prise en charge par ${staffUser.tag}`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public async transferTicket(
    guildId: string,
    ticketId: string,
    target: { staffId?: string; staffTag?: string; teamId?: string },
    performedBy: { id: string; tag: string }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    if (target.teamId) {
      ticket.assignedTeamId = target.teamId;
    }
    if (target.staffId && target.staffTag) {
      ticket.claimedBy = { id: target.staffId, tag: target.staffTag };
      ticket.status = 'WAITING_USER';
    }

    ticket.updatedAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'TRANSFERRED',
      actorTag: performedBy.tag,
      description: `Transfert du ticket vers ${target.staffTag || target.teamId}`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public async updatePriority(
    guildId: string,
    ticketId: string,
    priority: TicketPriority,
    performedBy: { id: string; tag: string }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    const oldPriority = ticket.priority;
    ticket.priority = priority;
    ticket.updatedAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'PRIORITY_CHANGED',
      actorTag: performedBy.tag,
      description: `Priorité modifiée : ${oldPriority} ➔ ${priority}`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public async updateStatus(
    guildId: string,
    ticketId: string,
    status: TicketStatus,
    performedBy: { id: string; tag: string }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'STATUS_CHANGED',
      actorTag: performedBy.tag,
      description: `Statut changé en ${status}`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public async updateTags(
    guildId: string,
    ticketId: string,
    tags: string[],
    performedBy: { id: string; tag: string }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.tags = tags;
    ticket.updatedAt = new Date().toISOString();
    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public async addInternalNote(
    guildId: string,
    ticketId: string,
    content: string,
    author: { id: string; tag: string; avatar?: string | null }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    const note = {
      id: `note-${Date.now()}`,
      authorId: author.id,
      authorTag: author.tag,
      authorAvatar: author.avatar,
      content,
      createdAt: new Date().toISOString(),
    };

    ticket.notes.unshift(note);
    ticket.updatedAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'NOTE_ADDED',
      actorTag: author.tag,
      description: `Ajout d’une note interne privée`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public async closeTicket(
    guild: Guild,
    ticketId: string,
    closedBy: { id: string; tag: string },
    reason: string = 'Résolu'
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guild.id, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    if (ticket.status === 'CLOSED') {
      throw new Error('Ce ticket est déjà fermé.');
    }

    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;

    // Génération du transcript
    let transcriptPath: string | null = null;
    if (channel) {
      try {
        const trans = await TranscriptService.generateTranscript(channel, ticket);
        transcriptPath = trans.filePath;
      } catch (err) {
        logger.error(`Erreur génération transcript pour ${ticket.id}:`, err);
      }
    }

    const now = new Date().toISOString();
    ticket.status = 'CLOSED';
    ticket.closedAt = now;
    ticket.closedBy = closedBy;
    ticket.closeReason = reason;
    ticket.transcriptPath = transcriptPath;
    ticket.updatedAt = now;
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'CLOSED',
      actorTag: closedBy.tag,
      description: `Fermeture du ticket : ${reason}`,
      timestamp: now,
    });

    ticketRepository.saveTicket(ticket);

    // Audit Center Log
    logService.emit({
      guildId: guild.id,
      module: 'SYSTEM',
      type: 'TICKET_CLOSE',
      actor: { id: closedBy.id, tag: closedBy.tag },
      target: { id: ticket.id, type: 'CASE', name: ticket.id },
      reason: `Fermeture ticket ${ticket.id} (${reason})`,
    });

    // Envoi de la notification et demande d'avis
    if (channel) {
      try {
        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle(`🔒 Ticket Fermé • ${ticket.id}`)
          .setDescription(`Ce ticket a été clôturé par **${closedBy.tag}**.\n**Motif** : ${reason}`)
          .setFooter({ text: 'Le salon sera supprimé automatiquement dans 5 secondes.' });

        await channel.send({ embeds: [embed] });

        // Suppression différée du salon Discord (5 secondes pour laisser lire)
        setTimeout(() => {
          channel.delete(`Fermeture ticket ${ticket.id} par ${closedBy.tag}`).catch(() => {});
        }, 5000);
      } catch {}
    }

    return ticket;
  }

  public async reopenTicket(
    guild: Guild,
    ticketId: string,
    reopenedBy: { id: string; tag: string }
  ): Promise<Ticket> {
    const ticket = ticketRepository.getTicketById(guild.id, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.status = 'OPEN';
    ticket.closedAt = null;
    ticket.closedBy = null;
    ticket.closeReason = null;
    ticket.updatedAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'REOPENED',
      actorTag: reopenedBy.tag,
      description: `Réouverture du ticket par ${reopenedBy.tag}`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public submitRating(guildId: string, ticketId: string, score: number, comment?: string): Ticket {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.rating = {
      score: Math.max(1, Math.min(5, score)),
      comment,
      ratedAt: new Date().toISOString(),
    };

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  public linkCase(guildId: string, ticketId: string, caseId: number | string, staffUser: { id: string; tag: string }): Ticket {
    const ticket = ticketRepository.getTicketById(guildId, ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.relatedCaseId = caseId;
    ticket.updatedAt = new Date().toISOString();
    ticket.activityTimeline.unshift({
      id: `act-${Date.now()}`,
      type: 'CASE_LINKED',
      actorTag: staffUser.tag,
      description: `Liaison avec le Dossier de Modération Case #${caseId}`,
      timestamp: new Date().toISOString(),
    });

    ticketRepository.saveTicket(ticket);
    return ticket;
  }

  // --- Helpers Déportés vers Repository ---

  public getOverview(guildId: string) {
    return ticketRepository.getOverview(guildId);
  }

  public getTickets(guildId: string, options: TicketQueryOptions = {}) {
    return ticketRepository.getTickets(guildId, options);
  }

  public getTicketById(guildId: string, ticketId: string) {
    return ticketRepository.getTicketById(guildId, ticketId);
  }

  public getCategories(guildId: string) {
    return ticketRepository.getCategories(guildId);
  }

  public saveCategory(category: TicketCategory) {
    ticketRepository.saveCategory(category);
  }

  public deleteCategory(guildId: string, categoryId: string) {
    return ticketRepository.deleteCategory(guildId, categoryId);
  }

  public getPanels(guildId: string) {
    return ticketRepository.getPanels(guildId);
  }

  public savePanel(panel: TicketPanel) {
    ticketRepository.savePanel(panel);
  }

  public deletePanel(guildId: string, panelId: string) {
    return ticketRepository.deletePanel(guildId, panelId);
  }

  public getTeams(guildId: string) {
    return ticketRepository.getTeams(guildId);
  }

  public saveTeam(team: TicketTeam) {
    ticketRepository.saveTeam(team);
  }

  public deleteTeam(guildId: string, teamId: string) {
    return ticketRepository.deleteTeam(guildId, teamId);
  }

  public getAutomations(guildId: string) {
    return ticketRepository.getAutomations(guildId);
  }

  public saveAutomation(rule: TicketAutomationRule) {
    ticketRepository.saveAutomation(rule);
  }

  public deleteAutomation(guildId: string, ruleId: string) {
    return ticketRepository.deleteAutomation(guildId, ruleId);
  }

  public getConfig(guildId: string) {
    return ticketRepository.getConfig(guildId);
  }

  public saveConfig(guildId: string, cfg: TicketGlobalConfig) {
    ticketRepository.saveConfig(guildId, cfg);
  }

  public getStaffAnalytics(guildId: string) {
    return ticketRepository.getStaffAnalytics(guildId);
  }
}

export const ticketService = new TicketService();
