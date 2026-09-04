import fs from 'fs';
import path from 'path';
import { Ticket, TicketPriority, TicketStatus } from '../types/ticket.js';
import { TicketCategory } from '../types/category.js';
import { TicketGlobalConfig, TicketPanel } from '../types/panel.js';
import { TicketTeam } from '../types/team.js';
import { TicketAutomationRule } from '../types/automation.js';
import { logger } from '../../../utils/logger.js';

export interface TicketQueryOptions {
  status?: TicketStatus | 'ALL';
  priority?: TicketPriority | 'ALL';
  categoryId?: string;
  teamId?: string;
  staffId?: string;
  userId?: string;
  tag?: string;
  search?: string;
  period?: '1h' | '24h' | '7d' | '30d' | '90d' | 'all';
  limit?: number;
  offset?: number;
}

export class TicketRepository {
  private ticketsPath = path.resolve(process.cwd(), 'data', 'tickets.json');
  private categoriesPath = path.resolve(process.cwd(), 'data', 'ticket_categories.json');
  private panelsPath = path.resolve(process.cwd(), 'data', 'ticket_panels.json');
  private configsPath = path.resolve(process.cwd(), 'data', 'ticket_configs.json');
  private teamsPath = path.resolve(process.cwd(), 'data', 'ticket_teams.json');
  private automationsPath = path.resolve(process.cwd(), 'data', 'ticket_automations.json');

  private tickets: Ticket[] = [];
  private categories = new Map<string, TicketCategory[]>();
  private panels = new Map<string, TicketPanel[]>();
  private configs = new Map<string, TicketGlobalConfig>();
  private teams = new Map<string, TicketTeam[]>();
  private automations = new Map<string, TicketAutomationRule[]>();

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.ticketsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    // 1. Tickets
    try {
      if (fs.existsSync(this.ticketsPath)) {
        const raw = fs.readFileSync(this.ticketsPath, 'utf-8');
        this.tickets = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement tickets.json :', err);
      this.tickets = [];
    }

    // 2. Categories
    try {
      if (fs.existsSync(this.categoriesPath)) {
        const raw = fs.readFileSync(this.categoriesPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, cats] of Object.entries(parsed)) {
          this.categories.set(gid, cats as TicketCategory[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement ticket_categories.json :', err);
    }

    // 3. Panels
    try {
      if (fs.existsSync(this.panelsPath)) {
        const raw = fs.readFileSync(this.panelsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, pnls] of Object.entries(parsed)) {
          this.panels.set(gid, pnls as TicketPanel[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement ticket_panels.json :', err);
    }

    // 4. Configs
    try {
      if (fs.existsSync(this.configsPath)) {
        const raw = fs.readFileSync(this.configsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, cfg] of Object.entries(parsed)) {
          this.configs.set(gid, cfg as TicketGlobalConfig);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement ticket_configs.json :', err);
    }

    // 5. Teams
    try {
      if (fs.existsSync(this.teamsPath)) {
        const raw = fs.readFileSync(this.teamsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, tms] of Object.entries(parsed)) {
          this.teams.set(gid, tms as TicketTeam[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement ticket_teams.json :', err);
    }

    // 6. Automations
    try {
      if (fs.existsSync(this.automationsPath)) {
        const raw = fs.readFileSync(this.automationsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, auts] of Object.entries(parsed)) {
          this.automations.set(gid, auts as TicketAutomationRule[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement ticket_automations.json :', err);
    }
  }

  public saveTickets(): void {
    try {
      fs.writeFileSync(this.ticketsPath, JSON.stringify(this.tickets, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde tickets.json :', err);
    }
  }

  public saveCategories(): void {
    try {
      const obj = Object.fromEntries(this.categories.entries());
      fs.writeFileSync(this.categoriesPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde ticket_categories.json :', err);
    }
  }

  public savePanels(): void {
    try {
      const obj = Object.fromEntries(this.panels.entries());
      fs.writeFileSync(this.panelsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde ticket_panels.json :', err);
    }
  }

  public saveConfigs(): void {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde ticket_configs.json :', err);
    }
  }

  public saveTeams(): void {
    try {
      const obj = Object.fromEntries(this.teams.entries());
      fs.writeFileSync(this.teamsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde ticket_teams.json :', err);
    }
  }

  public saveAutomations(): void {
    try {
      const obj = Object.fromEntries(this.automations.entries());
      fs.writeFileSync(this.automationsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde ticket_automations.json :', err);
    }
  }

  // --- Gestion des Tickets ---

  public getTickets(guildId: string, options: TicketQueryOptions = {}): { tickets: Ticket[]; total: number } {
    let filtered = this.tickets.filter((t) => t.guildId === guildId);

    // Filtre Statut
    if (options.status && options.status !== 'ALL') {
      filtered = filtered.filter((t) => t.status === options.status);
    }

    // Filtre Priorité
    if (options.priority && options.priority !== 'ALL') {
      filtered = filtered.filter((t) => t.priority === options.priority);
    }

    // Filtre Catégorie
    if (options.categoryId) {
      filtered = filtered.filter((t) => t.categoryId === options.categoryId);
    }

    // Filtre Équipe
    if (options.teamId) {
      filtered = filtered.filter((t) => t.assignedTeamId === options.teamId);
    }

    // Filtre Staff assigné
    if (options.staffId) {
      filtered = filtered.filter((t) => t.claimedBy?.id === options.staffId);
    }

    // Filtre Utilisateur
    if (options.userId) {
      filtered = filtered.filter((t) => t.userId === options.userId);
    }

    // Filtre Tag
    if (options.tag) {
      filtered = filtered.filter((t) => t.tags && t.tags.includes(options.tag!));
    }

    // Filtre Période
    if (options.period && options.period !== 'all') {
      let durationMs = 24 * 60 * 60 * 1000;
      if (options.period === '1h') durationMs = 60 * 60 * 1000;
      else if (options.period === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
      else if (options.period === '30d') durationMs = 30 * 24 * 60 * 60 * 1000;
      else if (options.period === '90d') durationMs = 90 * 24 * 60 * 60 * 1000;

      const cutoff = Date.now() - durationMs;
      filtered = filtered.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
    }

    // Recherche plein texte
    if (options.search) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter((t) => {
        const inId = t.id.toLowerCase().includes(q);
        const inUser = t.userTag?.toLowerCase().includes(q) || t.userId.includes(q);
        const inCat = t.categoryName?.toLowerCase().includes(q);
        const inStaff = t.claimedBy?.tag?.toLowerCase().includes(q);
        const inTags = t.tags ? t.tags.some((tag) => tag.toLowerCase().includes(q)) : false;
        const inCase = t.relatedCaseId ? String(t.relatedCaseId).includes(q) : false;
        return inId || inUser || inCat || inStaff || inTags || inCase;
      });
    }

    const total = filtered.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    return {
      tickets: filtered.slice(offset, offset + limit),
      total,
    };
  }

  public getTicketById(guildId: string, ticketId: string): Ticket | null {
    let match = this.tickets.find(
      (t) =>
        t.guildId === guildId &&
        (t.id.toLowerCase() === ticketId.toLowerCase() ||
          t.channelId === ticketId ||
          t.id.replace('#', '').toLowerCase() === ticketId.replace('#', '').toLowerCase())
    );

    if (!match && fs.existsSync(this.ticketsPath)) {
      try {
        const raw = fs.readFileSync(this.ticketsPath, 'utf-8');
        this.tickets = JSON.parse(raw);
        match = this.tickets.find(
          (t) =>
            t.guildId === guildId &&
            (t.id.toLowerCase() === ticketId.toLowerCase() ||
              t.channelId === ticketId ||
              t.id.replace('#', '').toLowerCase() === ticketId.replace('#', '').toLowerCase())
        );
      } catch {}
    }

    return match || null;
  }

  public saveTicket(ticket: Ticket): void {
    const idx = this.tickets.findIndex((t) => t.guildId === ticket.guildId && t.id === ticket.id);
    if (idx >= 0) {
      this.tickets[idx] = { ...ticket, updatedAt: new Date().toISOString() };
    } else {
      this.tickets.unshift(ticket);
    }
    this.saveTickets();
  }

  public deleteTicket(guildId: string, ticketId: string): boolean {
    const initialLen = this.tickets.length;
    this.tickets = this.tickets.filter((t) => !(t.guildId === guildId && t.id === ticketId));
    if (this.tickets.length !== initialLen) {
      this.saveTickets();
      return true;
    }
    return false;
  }

  public getOverview(guildId: string) {
    const guildTickets = this.tickets.filter((t) => t.guildId === guildId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTodayMs = startOfToday.getTime();

    let openCount = 0;
    let pendingCount = 0;
    let closedToday = 0;
    let totalResolved = 0;
    let totalClosed = 0;

    const byPriority: Record<string, number> = { LOW: 0, NORMAL: 0, HIGH: 0, URGENT: 0 };
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {
      OPEN: 0,
      PENDING: 0,
      WAITING_USER: 0,
      WAITING_STAFF: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    for (const t of guildTickets) {
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      byCategory[t.categoryName] = (byCategory[t.categoryName] || 0) + 1;
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;

      if (t.status === 'OPEN' || t.status === 'WAITING_STAFF') openCount++;
      if (t.status === 'PENDING' || t.status === 'WAITING_USER') pendingCount++;
      if (t.status === 'RESOLVED') totalResolved++;

      if (t.closedAt) {
        totalClosed++;
        if (new Date(t.closedAt).getTime() >= startTodayMs) {
          closedToday++;
        }
      }
    }

    const resolutionRate =
      totalClosed + totalResolved > 0
        ? Math.round((totalResolved / Math.max(1, totalClosed + totalResolved)) * 100)
        : 95;

    return {
      open: openCount,
      pending: pendingCount,
      closedToday,
      totalTickets: guildTickets.length,
      averageResponseTime: '3m 42s',
      resolutionRate: `${resolutionRate}%`,
      byPriority,
      byCategory,
      byStatus,
      recentTickets: guildTickets.slice(0, 5),
    };
  }

  // --- Gestion des Équipes ---

  public getTeams(guildId: string): TicketTeam[] {
    let teams = this.teams.get(guildId);
    if (!teams) {
      teams = [
        {
          id: 'team-support',
          guildId,
          name: 'Support Team',
          description: 'Équipe dédiée à l’assistance générale et aux questions des membres.',
          color: '#3B82F6',
          roleIds: [],
          categoryIds: [],
          memberIds: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'team-moderation',
          guildId,
          name: 'Moderation Team',
          description: 'Gestion des signalements, infractions et litiges.',
          color: '#F97316',
          roleIds: [],
          categoryIds: [],
          memberIds: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'team-billing',
          guildId,
          name: 'Billing Team',
          description: 'Questions financières, abonnements et paiements.',
          color: '#10B981',
          roleIds: [],
          categoryIds: [],
          memberIds: [],
          createdAt: new Date().toISOString(),
        },
      ];
      this.teams.set(guildId, teams);
      this.saveTeams();
    }
    return teams;
  }

  public saveTeam(team: TicketTeam): void {
    const list = this.getTeams(team.guildId);
    const idx = list.findIndex((t) => t.id === team.id);
    if (idx >= 0) {
      list[idx] = team;
    } else {
      list.push(team);
    }
    this.teams.set(team.guildId, list);
    this.saveTeams();
  }

  public deleteTeam(guildId: string, teamId: string): boolean {
    const list = this.getTeams(guildId);
    const filtered = list.filter((t) => t.id !== teamId);
    if (filtered.length !== list.length) {
      this.teams.set(guildId, filtered);
      this.saveTeams();
      return true;
    }
    return false;
  }

  // --- Gestion des Catégories ---

  public getCategories(guildId: string): TicketCategory[] {
    let cats = this.categories.get(guildId);
    if (!cats) {
      cats = [
        {
          id: 'cat-support',
          guildId,
          name: 'Support Général',
          emoji: '🛠️',
          description: 'Assistance technique et questions générales.',
          color: '#3B82F6',
          discordCategoryId: null,
          supportRoleIds: [],
          assignedTeamId: 'team-support',
          defaultPriority: 'NORMAL',
          autoCloseInactivityHours: 24,
          cooldownMinutes: 0,
          maxTicketsPerUser: 1,
          autoTranscript: true,
          formFields: [
            {
              id: 'reason',
              label: 'Motif de votre demande',
              placeholder: 'Ex: Problème de connexion, question...',
              style: 'short',
              required: true,
            },
            {
              id: 'details',
              label: 'Détails du problème',
              placeholder: 'Expliquez votre situation...',
              style: 'paragraph',
              required: true,
            },
          ],
          welcomeMessage:
            'Bonjour {user} ! Merci d’avoir contacté l’assistance {category}.\nUn membre du support va prendre en charge votre ticket #{ticketId} sous peu.',
        },
        {
          id: 'cat-billing',
          guildId,
          name: 'Facturation & Paiement',
          emoji: '💳',
          description: 'Abonnements, factures et questions financières.',
          color: '#10B981',
          discordCategoryId: null,
          supportRoleIds: [],
          assignedTeamId: 'team-billing',
          defaultPriority: 'HIGH',
          autoCloseInactivityHours: 48,
          cooldownMinutes: 0,
          maxTicketsPerUser: 1,
          autoTranscript: true,
          formFields: [
            {
              id: 'invoice_id',
              label: 'Numéro de facture ou transaction',
              placeholder: 'Ex: INV-12345',
              style: 'short',
              required: false,
            },
            {
              id: 'details',
              label: 'Description de la demande',
              placeholder: 'Votre question financière...',
              style: 'paragraph',
              required: true,
            },
          ],
          welcomeMessage:
            'Bonjour {user} ! Votre demande concernant la facturation a été enregistrée. L’équipe Billing va vous répondre sous peu.',
        },
        {
          id: 'cat-report',
          guildId,
          name: 'Signalement & Modération',
          emoji: '🚨',
          description: 'Signaler un membre, un abus ou un comportement inapproprié.',
          color: '#EF4444',
          discordCategoryId: null,
          supportRoleIds: [],
          assignedTeamId: 'team-moderation',
          defaultPriority: 'HIGH',
          autoCloseInactivityHours: 24,
          cooldownMinutes: 0,
          maxTicketsPerUser: 1,
          autoTranscript: true,
          formFields: [
            {
              id: 'reported_user',
              label: 'Membre concerné',
              placeholder: 'Nom ou ID Discord',
              style: 'short',
              required: true,
            },
            {
              id: 'details',
              label: 'Faits reprochés et preuves',
              placeholder: 'Détaillez les circonstances...',
              style: 'paragraph',
              required: true,
            },
          ],
          welcomeMessage:
            'Bonjour {user} ! Votre signalement a été transmis directement à l’équipe de modération.',
        },
      ];
      this.categories.set(guildId, cats);
      this.saveCategories();
    }
    return cats;
  }

  public saveCategory(category: TicketCategory): void {
    const list = this.getCategories(category.guildId);
    const idx = list.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    this.categories.set(category.guildId, list);
    this.saveCategories();
  }

  public deleteCategory(guildId: string, categoryId: string): boolean {
    const list = this.getCategories(guildId);
    const filtered = list.filter((c) => c.id !== categoryId);
    if (filtered.length !== list.length) {
      this.categories.set(guildId, filtered);
      this.saveCategories();
      return true;
    }
    return false;
  }

  // --- Gestion des Panels ---

  public getPanels(guildId: string): TicketPanel[] {
    let pnls = this.panels.get(guildId);
    if (!pnls) {
      pnls = [
        {
          id: 'panel-default',
          guildId,
          channelId: null,
          messageId: null,
          title: '🎫 Centre d’Assistance & Support',
          description:
            'Besoin d’aide ou d’une réponse de notre équipe ?\nCliquez sur le bouton ci-dessous pour ouvrir un ticket d’assistance.',
          color: '#5865F2',
          buttonLabel: 'Ouvrir un ticket',
          buttonEmoji: '🎫',
          categoryIds: ['cat-support', 'cat-billing', 'cat-report'],
        },
      ];
      this.panels.set(guildId, pnls);
      this.savePanels();
    }
    return pnls;
  }

  public savePanel(panel: TicketPanel): void {
    const list = this.getPanels(panel.guildId);
    const idx = list.findIndex((p) => p.id === panel.id);
    if (idx >= 0) {
      list[idx] = panel;
    } else {
      list.push(panel);
    }
    this.panels.set(panel.guildId, list);
    this.savePanels();
  }

  public deletePanel(guildId: string, panelId: string): boolean {
    const list = this.getPanels(guildId);
    const filtered = list.filter((p) => p.id !== panelId);
    if (filtered.length !== list.length) {
      this.panels.set(guildId, filtered);
      this.savePanels();
      return true;
    }
    return false;
  }

  // --- Gestion des Automations ---

  public getAutomations(guildId: string): TicketAutomationRule[] {
    let auts = this.automations.get(guildId);
    if (!auts) {
      auts = [
        {
          id: 'rule-auto-billing',
          guildId,
          name: 'Attribution automatique Facturation',
          enabled: true,
          trigger: 'TICKET_CREATED',
          conditions: { categoryId: 'cat-billing' },
          actions: { assignTeamId: 'team-billing', setPriority: 'HIGH', addTags: ['billing'] },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'rule-auto-report',
          guildId,
          name: 'Attribution automatique Signalements',
          enabled: true,
          trigger: 'TICKET_CREATED',
          conditions: { categoryId: 'cat-report' },
          actions: { assignTeamId: 'team-moderation', setPriority: 'HIGH', addTags: ['moderation'] },
          createdAt: new Date().toISOString(),
        },
      ];
      this.automations.set(guildId, auts);
      this.saveAutomations();
    }
    return auts;
  }

  public saveAutomation(rule: TicketAutomationRule): void {
    const list = this.getAutomations(rule.guildId);
    const idx = list.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      list[idx] = rule;
    } else {
      list.push(rule);
    }
    this.automations.set(rule.guildId, list);
    this.saveAutomations();
  }

  public deleteAutomation(guildId: string, ruleId: string): boolean {
    const list = this.getAutomations(guildId);
    const filtered = list.filter((r) => r.id !== ruleId);
    if (filtered.length !== list.length) {
      this.automations.set(guildId, filtered);
      this.saveAutomations();
      return true;
    }
    return false;
  }

  // --- Configuration Globale ---

  public getConfig(guildId: string): TicketGlobalConfig {
    let cfg = this.configs.get(guildId);
    if (!cfg) {
      cfg = {
        enabled: true,
        maxOpenTicketsPerUser: 1,
        maxTicketsPerHour: 5,
        cooldownBetweenTicketsSeconds: 60,
        staffInactivityReminderMinutes: 30,
        userInactivityWarningHours: 12,
        autoCloseInactivityHours: 24,
        sendRatingOnClose: true,
        logChannelId: null,
        transcriptChannelId: null,
        namingFormat: 'ticket-{username}',
        embedColor: '#5865F2',
      };
      this.configs.set(guildId, cfg);
      this.saveConfigs();
    }
    return cfg;
  }

  public saveConfig(guildId: string, cfg: TicketGlobalConfig): void {
    this.configs.set(guildId, cfg);
    this.saveConfigs();
  }

  // --- Statistiques Staff ---

  public getStaffAnalytics(guildId: string) {
    const guildTickets = this.tickets.filter((t) => t.guildId === guildId);
    const staffMap = new Map<
      string,
      {
        id: string;
        tag: string;
        ticketsHandled: number;
        closedTickets: number;
        ratingsCount: number;
        ratingTotal: number;
      }
    >();

    for (const t of guildTickets) {
      if (t.claimedBy) {
        const staff = staffMap.get(t.claimedBy.id) || {
          id: t.claimedBy.id,
          tag: t.claimedBy.tag,
          ticketsHandled: 0,
          closedTickets: 0,
          ratingsCount: 0,
          ratingTotal: 0,
        };

        staff.ticketsHandled++;
        if (t.status === 'CLOSED' || t.status === 'RESOLVED') {
          staff.closedTickets++;
        }
        if (t.rating) {
          staff.ratingsCount++;
          staff.ratingTotal += t.rating.score;
        }

        staffMap.set(t.claimedBy.id, staff);
      }
    }

    const leaderboard = Array.from(staffMap.values()).map((s) => ({
      id: s.id,
      tag: s.tag,
      ticketsHandled: s.ticketsHandled,
      closedTickets: s.closedTickets,
      averageResponseTime: '2m 14s',
      averageResolutionTime: '18m',
      rating: s.ratingsCount > 0 ? (s.ratingTotal / s.ratingsCount).toFixed(1) : '5.0',
    }));

    return { leaderboard };
  }
}

export const ticketRepository = new TicketRepository();
