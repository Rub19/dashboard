import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
  User,
} from 'discord.js';
import { Ticket, TicketSchema } from '../types/ticket.js';
import { TicketCategory, TicketCategorySchema } from '../types/category.js';
import {
  TicketGlobalConfig,
  TicketGlobalConfigSchema,
  TicketPanel,
  TicketPanelSchema,
} from '../types/panel.js';
import { TicketLogger } from '../logs/ticketLogger.js';
import { TranscriptService } from './transcriptService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logger } from '../../../utils/logger.js';

class TicketService {
  private ticketsPath = path.resolve(process.cwd(), 'data', 'tickets.json');
  private categoriesPath = path.resolve(process.cwd(), 'data', 'ticket_categories.json');
  private panelsPath = path.resolve(process.cwd(), 'data', 'ticket_panels.json');
  private configsPath = path.resolve(process.cwd(), 'data', 'ticket_configs.json');

  private tickets: Ticket[] = [];
  private categories = new Map<string, TicketCategory[]>(); // guildId -> categories
  private panels = new Map<string, TicketPanel[]>(); // guildId -> panels
  private configs = new Map<string, TicketGlobalConfig>(); // guildId -> config

  // Verrou anti-double clic
  private creatingUsers = new Set<string>();

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.ticketsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    // 1. Tickets
    try {
      if (fs.existsSync(this.ticketsPath)) {
        this.tickets = JSON.parse(fs.readFileSync(this.ticketsPath, 'utf-8'));
      }
    } catch (e) {
      logger.error('Erreur chargement tickets.json :', e);
    }

    // 2. Catégories
    try {
      if (fs.existsSync(this.categoriesPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.categoriesPath, 'utf-8'));
        for (const [gid, cats] of Object.entries(parsed)) {
          this.categories.set(gid, cats as TicketCategory[]);
        }
      }
    } catch (e) {
      logger.error('Erreur chargement ticket_categories.json :', e);
    }

    // 3. Panels
    try {
      if (fs.existsSync(this.panelsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.panelsPath, 'utf-8'));
        for (const [gid, pnl] of Object.entries(parsed)) {
          this.panels.set(gid, pnl as TicketPanel[]);
        }
      }
    } catch (e) {
      logger.error('Erreur chargement ticket_panels.json :', e);
    }

    // 4. Configs
    try {
      if (fs.existsSync(this.configsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configsPath, 'utf-8'));
        for (const [gid, cfg] of Object.entries(parsed)) {
          this.configs.set(gid, cfg as TicketGlobalConfig);
        }
      }
    } catch (e) {
      logger.error('Erreur chargement ticket_configs.json :', e);
    }
  }

  private saveTickets() {
    fs.writeFileSync(this.ticketsPath, JSON.stringify(this.tickets, null, 2), 'utf-8');
  }

  private saveCategories() {
    const obj = Object.fromEntries(this.categories.entries());
    fs.writeFileSync(this.categoriesPath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  private savePanels() {
    const obj = Object.fromEntries(this.panels.entries());
    fs.writeFileSync(this.panelsPath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  private saveConfigs() {
    const obj = Object.fromEntries(this.configs.entries());
    fs.writeFileSync(this.configsPath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  // ==========================================
  // Gestion Config & Catégories
  // ==========================================
  public getConfig(guildId: string): TicketGlobalConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = TicketGlobalConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<TicketGlobalConfig>): TicketGlobalConfig {
    const current = this.getConfig(guildId);
    const valid = TicketGlobalConfigSchema.parse({ ...current, ...update });
    this.configs.set(guildId, valid);
    this.saveConfigs();
    return valid;
  }

  public getCategories(guildId: string): TicketCategory[] {
    let cats = this.categories.get(guildId);
    if (!cats || cats.length === 0) {
      // Catégories par défaut
      cats = [
        {
          id: 'support_general',
          guildId,
          name: 'Support Général',
          emoji: '🎫',
          description: 'Questions, aide générale et assistance technique.',
          color: '#5865F2',
          discordCategoryId: null,
          supportRoleIds: [],
          formFields: [
            {
              id: 'subject',
              label: 'Objet de votre demande',
              placeholder: 'Ex: Question sur les rôles',
              style: 'short',
              required: true,
            },
            {
              id: 'description',
              label: 'Description détaillée',
              placeholder: 'Expliquez précisément votre problème...',
              style: 'paragraph',
              required: true,
            },
          ],
          welcomeMessage:
            'Bonjour {user} ! Merci d’avoir contacté l’assistance.\nUn membre du support va prendre en charge votre demande sous peu.',
        },
        {
          id: 'bug_report',
          guildId,
          name: 'Signalement de Bug',
          emoji: '🐛',
          description: 'Rapport d’erreur ou dysfonctionnement.',
          color: '#F59E0B',
          discordCategoryId: null,
          supportRoleIds: [],
          formFields: [
            {
              id: 'bug_summary',
              label: 'Résumé du bug',
              placeholder: 'Que s’est-il passé ?',
              style: 'short',
              required: true,
            },
          ],
          welcomeMessage:
            'Bonjour {user} ! Merci de nous signaler ce problème. Décrivez les étapes pour le reproduire.',
        },
        {
          id: 'billing_purchases',
          guildId,
          name: 'Facturation & Achats',
          emoji: '💰',
          description: 'Questions relatives aux commandes et paiements.',
          color: '#10B981',
          discordCategoryId: null,
          supportRoleIds: [],
          formFields: [
            {
              id: 'order_id',
              label: 'Numéro de commande ou transaction',
              placeholder: 'Ex: #CMD-1234',
              style: 'short',
              required: false,
            },
          ],
          welcomeMessage:
            'Bonjour {user} ! Un responsable de la facturation va vérifier votre dossier sous peu.',
        },
      ];
      this.categories.set(guildId, cats);
      this.saveCategories();
    }
    return cats;
  }

  public saveCategory(guildId: string, categoryData: Partial<TicketCategory>): TicketCategory {
    const cats = this.getCategories(guildId);
    const id = categoryData.id || `cat_${Date.now()}`;
    const valid = TicketCategorySchema.parse({
      ...categoryData,
      id,
      guildId,
    });

    const index = cats.findIndex((c) => c.id === id);
    if (index >= 0) {
      cats[index] = valid;
    } else {
      cats.push(valid);
    }

    this.categories.set(guildId, cats);
    this.saveCategories();
    return valid;
  }

  public deleteCategory(guildId: string, categoryId: string): boolean {
    const cats = this.getCategories(guildId);
    const filtered = cats.filter((c) => c.id !== categoryId);
    if (filtered.length !== cats.length) {
      this.categories.set(guildId, filtered);
      this.saveCategories();
      return true;
    }
    return false;
  }

  // ==========================================
  // Gestion des Panels
  // ==========================================
  public getPanels(guildId: string): TicketPanel[] {
    let list = this.panels.get(guildId);
    if (!list) {
      list = [];
      this.panels.set(guildId, list);
    }
    return list;
  }

  public savePanel(guildId: string, panelData: Partial<TicketPanel>): TicketPanel {
    const list = this.getPanels(guildId);
    const id = panelData.id || `panel_${Date.now()}`;
    const valid = TicketPanelSchema.parse({
      ...panelData,
      id,
      guildId,
    });

    const index = list.findIndex((p) => p.id === id);
    if (index >= 0) {
      list[index] = valid;
    } else {
      list.push(valid);
    }

    this.panels.set(guildId, list);
    this.savePanels();
    return valid;
  }

  // ==========================================
  // Cycle de Vie : Création de Ticket
  // ==========================================
  public async createTicket(
    guild: Guild,
    user: User,
    categoryId: string,
    answers: Record<string, string> = {}
  ): Promise<Ticket> {
    const lockKey = `${guild.id}:${user.id}`;
    if (this.creatingUsers.has(lockKey)) {
      throw new Error('Un ticket est déjà en cours de création.');
    }
    this.creatingUsers.add(lockKey);

    try {
      const config = this.getConfig(guild.id);
      const userOpenTickets = this.tickets.filter(
        (t) => t.guildId === guild.id && t.userId === user.id && t.status !== 'closed'
      );

      if (userOpenTickets.length >= config.maxOpenTicketsPerUser) {
        throw new Error(
          `Vous avez déjà ${userOpenTickets.length} ticket(s) ouvert(s). Fermez vos anciens tickets avant d’en créer un nouveau.`
        );
      }

      const category = this.getCategories(guild.id).find((c) => c.id === categoryId);
      const catName = category ? category.name : 'Support';
      const catColor = category?.color || '#5865F2';

      // Numéro de ticket
      const ticketNum = Math.floor(1000 + Math.random() * 9000);
      const ticketId = `TICKET-${ticketNum}`;

      // Nom du salon
      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      const channelName = `ticket-${cleanUsername}`;

      // Overwrites permissions Discord
      const permissionOverwrites: any[] = [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id, // Auteur
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: guild.members.me!.id, // Bot
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ];

      // Ajout des rôles support de la catégorie
      if (category?.supportRoleIds) {
        for (const roleId of category.supportRoleIds) {
          if (guild.roles.cache.has(roleId)) {
            permissionOverwrites.push({
              id: roleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            });
          }
        }
      }

      // Création du salon textuel
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category?.discordCategoryId || undefined,
        permissionOverwrites,
      });

      // Enregistrement
      const ticket: Ticket = {
        id: ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: user.id,
        userTag: user.tag,
        categoryId,
        categoryName: catName,
        status: 'open',
        claimedBy: null,
        answers,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        transcriptPath: null,
      };

      this.tickets.unshift(ticket);
      this.saveTickets();

      // Envoi de l'embed de bienvenue dans le ticket
      const embed = new EmbedBuilder()
        .setColor(catColor as `#${string}`)
        .setTitle(`${category?.emoji || '🎫'} ${catName} • #${ticketId}`)
        .setDescription(
          `Bonjour ${user} ! Merci d’avoir ouvert ce ticket.\nDécrivez précisément votre demande, notre équipe va vous prendre en charge sous peu.`
        )
        .addFields([
          { name: 'Créateur', value: `${user.tag} (${user.id})`, inline: true },
          { name: 'Prise en charge', value: '*Non assigné*', inline: true },
        ]);

      // Si des réponses de formulaires existent, les afficher
      for (const [key, val] of Object.entries(answers)) {
        if (val) {
          embed.addFields([{ name: key, value: val.slice(0, 1024), inline: false }]);
        }
      }

      embed.setFooter({ text: 'ETHONE Support System' }).setTimestamp();

      // Boutons interactifs du ticket
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim:${ticketId}`)
          .setLabel('Prendre en charge (Claim)')
          .setEmoji('🎯')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticketId}`)
          .setLabel('Fermer le ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: `${user}`, embeds: [embed], components: [buttons] });

      // Journalisation
      await TicketLogger.logEvent(guild, config.logChannelId, '🎫 Nouveau Ticket Créé', '#10B981', [
        { name: 'Ticket', value: `#${channel.name} (${ticketId})`, inline: true },
        { name: 'Membre', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Catégorie', value: catName, inline: true },
      ]);

      return ticket;
    } finally {
      this.creatingUsers.delete(lockKey);
    }
  }

  // ==========================================
  // Prise en Charge (Claim / Unclaim)
  // ==========================================
  public async claimTicket(ticketId: string, moderator: User): Promise<Ticket> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.claimedBy = {
      id: moderator.id,
      tag: moderator.tag,
    };
    ticket.status = 'claimed';
    this.saveTickets();

    return ticket;
  }

  public async unclaimTicket(ticketId: string): Promise<Ticket> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.claimedBy = null;
    ticket.status = 'open';
    this.saveTickets();

    return ticket;
  }

  // ==========================================
  // Fermeture / Réouverture / Suppression
  // ==========================================
  public async closeTicket(ticketId: string, moderator: User, guild: Guild): Promise<Ticket> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = { id: moderator.id, tag: moderator.tag };
    this.saveTickets();

    // Bloquer l'envoi de messages pour le créateur
    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
    if (channel) {
      await channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: false,
      });

      const closeEmbed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle('🔒 Ticket Fermé')
        .setDescription(
          `Ce ticket a été fermé par **${moderator.tag}**.\nVous pouvez consulter le transcript ou le supprimer définitivement ci-dessous.`
        )
        .setTimestamp();

      const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_transcript:${ticketId}`)
          .setLabel('Générer Transcript')
          .setEmoji('📄')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_reopen:${ticketId}`)
          .setLabel('Rouvrir le ticket')
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_delete:${ticketId}`)
          .setLabel('Supprimer le ticket')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [closeEmbed], components: [actionButtons] });
    }

    const config = this.getConfig(guild.id);
    await TicketLogger.logEvent(guild, config.logChannelId, '🔒 Ticket Fermé', '#EF4444', [
      { name: 'Ticket', value: `#${ticket.id}`, inline: true },
      { name: 'Fermé par', value: `${moderator.tag}`, inline: true },
    ]);

    return ticket;
  }

  public async reopenTicket(ticketId: string, moderator: User, guild: Guild): Promise<Ticket> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    ticket.status = ticket.claimedBy ? 'claimed' : 'open';
    ticket.closedAt = null;
    ticket.closedBy = null;
    this.saveTickets();

    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
    if (channel) {
      await channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: true,
      });

      const reopenEmbed = new EmbedBuilder()
        .setColor('#10B981')
        .setTitle('🔓 Ticket Rouvert')
        .setDescription(`Le ticket a été rouvert par **${moderator.tag}**.`);

      await channel.send({ embeds: [reopenEmbed] });
    }

    return ticket;
  }

  public async deleteTicket(ticketId: string, moderator: User, guild: Guild): Promise<void> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket introuvable.');

    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
    if (channel) {
      // Générer le transcript automatiquement avant suppression
      try {
        await TranscriptService.generateTranscript(channel, ticket);
      } catch {}

      await channel.delete('Suppression du ticket par un modérateur');
    }

    const config = this.getConfig(guild.id);
    await TicketLogger.logEvent(guild, config.logChannelId, '🗑️ Ticket Supprimé', '#94A3B8', [
      { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
      { name: 'Supprimé par', value: `${moderator.tag}`, inline: true },
    ]);
  }

  // ==========================================
  // Données pour le Dashboard Web
  // ==========================================
  public getGuildTickets(guildId: string): Ticket[] {
    return this.tickets.filter((t) => t.guildId === guildId);
  }

  public getOverview(guildId: string) {
    const list = this.getGuildTickets(guildId);
    const openCount = list.filter((t) => t.status !== 'closed').length;
    const closedCount = list.filter((t) => t.status === 'closed').length;

    // Staff stats
    const staffMap = new Map<string, number>();
    for (const t of list) {
      if (t.claimedBy) {
        staffMap.set(t.claimedBy.tag, (staffMap.get(t.claimedBy.tag) || 0) + 1);
      }
    }

    const staffLeaderboard = Array.from(staffMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCount: list.length,
      openCount,
      closedCount,
      recentTickets: list.slice(0, 15),
      staffLeaderboard,
    };
  }
}

export const ticketService = new TicketService();
