import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { ticketService } from '../../modules/tickets/services/ticketService.js';
import { TicketPriority, TicketStatus } from '../../modules/tickets/types/ticket.js';
import { logger } from '../../utils/logger.js';
import { rateLimit, idempotent } from '../middleware/antiAbuseMiddleware.js';

export function createTicketRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 🛡️ Anti-abuse: Rate limit and idempotent mutative operations (POST, PUT, PATCH, DELETE)
  router.use((req: Request, res: Response, next: express.NextFunction) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return rateLimit('CONFIG', { byGuild: true, actionName: 'ticket_mutation' })(req, res, () => {
        return idempotent({ scopePrefix: 'ticket' })(req, res, next);
      });
    }
    next();
  });

  // 1. Vue d'ensemble & Stats
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const overview = ticketService.getOverview(guildId);
      res.json(overview);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des stats' });
    }
  });

  // 2. Liste des tickets avec filtres, recherche et pagination
  const handleGetTickets = async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const {
        status,
        priority,
        categoryId,
        teamId,
        staffId,
        userId,
        tag,
        search,
        period,
        limit,
        offset,
      } = req.query;

      const result = ticketService.getTickets(guildId, {
        status: status ? (String(status) as any) : undefined,
        priority: priority ? (String(priority) as any) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        teamId: teamId ? String(teamId) : undefined,
        staffId: staffId ? String(staffId) : undefined,
        userId: userId ? String(userId) : undefined,
        tag: tag ? String(tag) : undefined,
        search: search ? String(search) : undefined,
        period: period ? (String(period) as any) : undefined,
        limit: limit ? parseInt(String(limit), 10) : 50,
        offset: offset ? parseInt(String(offset), 10) : 0,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des tickets' });
    }
  };

  router.get('/tickets', handleGetTickets);
  router.get('/list', handleGetTickets);

  // 3. Détail d'un ticket
  router.get('/tickets/:ticketId', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const ticket = ticketService.getTicketById(guildId, ticketId);
      if (!ticket) {
        res.status(404).json({ error: 'Ticket introuvable' });
        return;
      }
      res.json({ ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Actions sur un Ticket
  // Claim
  router.post('/tickets/:ticketId/claim', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { staffId, staffTag, staffAvatar } = req.body;
      if (!staffId || !staffTag) {
        res.status(400).json({ error: 'staffId et staffTag sont requis.' });
        return;
      }
      const ticket = await ticketService.claimTicket(guildId, ticketId, {
        id: staffId,
        tag: staffTag,
        avatar: staffAvatar,
      });
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Unclaim
  router.post('/tickets/:ticketId/unclaim', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { staffId, staffTag } = req.body;
      const ticket = await ticketService.unclaimTicket(guildId, ticketId, {
        id: staffId || 'staff',
        tag: staffTag || 'Staff',
      });
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Transfer
  router.post('/tickets/:ticketId/transfer', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { target, performedBy } = req.body;
      const ticket = await ticketService.transferTicket(
        guildId,
        ticketId,
        target || {},
        performedBy || { id: 'staff', tag: 'Staff' }
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update Priority
  router.post('/tickets/:ticketId/priority', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { priority, performedBy } = req.body;
      const ticket = await ticketService.updatePriority(
        guildId,
        ticketId,
        priority as TicketPriority,
        performedBy || { id: 'staff', tag: 'Staff' }
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update Status
  router.post('/tickets/:ticketId/status', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { status, performedBy } = req.body;
      const ticket = await ticketService.updateStatus(
        guildId,
        ticketId,
        status as TicketStatus,
        performedBy || { id: 'staff', tag: 'Staff' }
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update Tags
  router.post('/tickets/:ticketId/tags', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { tags, performedBy } = req.body;
      const ticket = await ticketService.updateTags(
        guildId,
        ticketId,
        Array.isArray(tags) ? tags : [],
        performedBy || { id: 'staff', tag: 'Staff' }
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Notes Internes
  router.post('/tickets/:ticketId/notes', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { content, author } = req.body;
      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Le contenu de la note est requis.' });
        return;
      }
      const ticket = await ticketService.addInternalNote(
        guildId,
        ticketId,
        content.trim(),
        author || { id: 'staff', tag: 'Staff' }
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Close Ticket
  router.post('/tickets/:ticketId/close', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { closedBy, reason } = req.body;

      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) {
        res.status(404).json({ error: 'Serveur Discord introuvable' });
        return;
      }

      const ticket = await ticketService.closeTicket(
        guild,
        ticketId,
        closedBy || { id: 'dashboard', tag: 'Dashboard' },
        reason || 'Résolu via Dashboard'
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reopen Ticket
  router.post('/tickets/:ticketId/reopen', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { reopenedBy } = req.body;

      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) {
        res.status(404).json({ error: 'Serveur Discord introuvable' });
        return;
      }

      const ticket = await ticketService.reopenTicket(
        guild,
        ticketId,
        reopenedBy || { id: 'dashboard', tag: 'Dashboard' }
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Link Moderation Case
  router.post('/tickets/:ticketId/link-case', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { caseId, staffUser } = req.body;
      const ticket = ticketService.linkCase(
        guildId,
        ticketId,
        caseId,
        staffUser || { id: 'staff', tag: 'Staff' }
      );
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Submit Rating
  router.post('/tickets/:ticketId/rate', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const ticketId = String(req.params.ticketId);
      const { score, comment } = req.body;
      const ticket = ticketService.submitRating(guildId, ticketId, Number(score) || 5, comment);
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 5. Catégories
  router.get('/categories', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const categories = ticketService.getCategories(guildId);
    res.json({ categories });
  });

  router.post('/categories', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const categoryData = { ...req.body, guildId };
      ticketService.saveCategory(categoryData);
      res.json({ success: true, category: categoryData });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  router.delete('/categories/:catId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const catId = String(req.params.catId);
    const deleted = ticketService.deleteCategory(guildId, catId);
    res.json({ success: deleted });
  });

  // 6. Panels
  router.get('/panels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panels = ticketService.getPanels(guildId);
    res.json({ panels });
  });

  router.post('/panels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const panelData = { ...req.body, guildId };
      ticketService.savePanel(panelData);
      res.json({ success: true, panel: panelData });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  router.delete('/panels/:panelId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panelId = String(req.params.panelId);
    const deleted = ticketService.deletePanel(guildId, panelId);
    res.json({ success: deleted });
  });

  // Publier un Panel dans un salon Discord
  router.post('/panels/:panelId/publish', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panelId = String(req.params.panelId);
    const { channelId } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }

    const panel = ticketService.getPanels(guildId).find((p) => p.id === panelId);
    if (!panel) {
      res.status(404).json({ error: 'Panel introuvable' });
      return;
    }

    const targetChannelId = channelId || panel.channelId;
    if (!targetChannelId) {
      res.status(400).json({ error: 'Veuillez sélectionner un salon textuel de destination.' });
      return;
    }

    const channel = guild.channels.cache.get(targetChannelId) as TextChannel | undefined;
    if (!channel || channel.type !== ChannelType.GuildText) {
      res.status(400).json({ error: 'Le salon sélectionné est introuvable ou n’est pas textuel.' });
      return;
    }

    try {
      const embed = new EmbedBuilder()
        .setColor((panel.color || '#5865F2') as `#${string}`)
        .setTitle(panel.title || '🎫 Support & Assistance')
        .setDescription(
          panel.description ||
            'Besoin d’aide ou d’une question ? Cliquez sur le bouton ci-dessous pour créer un ticket.'
        )
        .setFooter({ text: `${guild.name} • Système de Support` })
        .setTimestamp();

      const allCategories = ticketService.getCategories(guildId);
      const selectedCats =
        panel.categoryIds && panel.categoryIds.length > 0
          ? allCategories.filter((c) => panel.categoryIds.includes(c.id))
          : allCategories;

      const buttonsRow = new ActionRowBuilder<ButtonBuilder>();

      if (selectedCats.length === 1) {
        const cat = selectedCats[0];
        buttonsRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_open:${cat.id}`)
            .setLabel(panel.buttonLabel || `Ouvrir un ticket (${cat.name})`)
            .setEmoji(cat.emoji || '🎫')
            .setStyle(ButtonStyle.Primary)
        );
      } else {
        for (const cat of selectedCats.slice(0, 5)) {
          buttonsRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`ticket_open:${cat.id}`)
              .setLabel(cat.name)
              .setEmoji(cat.emoji || '🎫')
              .setStyle(ButtonStyle.Secondary)
          );
        }
      }

      const sent = await channel.send({
        embeds: [embed],
        components: [buttonsRow],
      });

      ticketService.savePanel({
        ...panel,
        channelId: channel.id,
        messageId: sent.id,
      });

      res.json({ success: true, messageId: sent.id, channelName: channel.name });
    } catch (err: any) {
      logger.error('Erreur publication panel tickets :', err);
      res.status(500).json({ error: err.message || 'Impossible de publier le panel sur Discord' });
    }
  });

  // 7. Équipes de Staff
  router.get('/teams', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const teams = ticketService.getTeams(guildId);
    res.json({ teams });
  });

  router.post('/teams', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const teamData = { ...req.body, guildId };
      ticketService.saveTeam(teamData);
      res.json({ success: true, team: teamData });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  router.delete('/teams/:teamId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const teamId = String(req.params.teamId);
    const deleted = ticketService.deleteTeam(guildId, teamId);
    res.json({ success: deleted });
  });

  // 8. Règles d'Automatisation
  router.get('/automations', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const automations = ticketService.getAutomations(guildId);
    res.json({ automations });
  });

  router.post('/automations', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const ruleData = { ...req.body, guildId };
      ticketService.saveAutomation(ruleData);
      res.json({ success: true, automation: ruleData });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  router.delete('/automations/:ruleId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const ruleId = String(req.params.ruleId);
    const deleted = ticketService.deleteAutomation(guildId, ruleId);
    res.json({ success: deleted });
  });

  // 9. Analytics & Staff Leaderboard
  router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
    try {
      const guildId = String(req.params.guildId);
      const analytics = ticketService.getStaffAnalytics(guildId);
      res.json({ analytics });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Configuration globale des tickets
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = ticketService.getConfig(guildId);
    res.json({ config });
  });

  const handleUpdateConfig = async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const current = ticketService.getConfig(guildId);
      const updated = { ...current, ...req.body, guildId };
      ticketService.saveConfig(guildId, updated);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  };

  router.patch('/config', handleUpdateConfig);
  router.put('/config', handleUpdateConfig);

  // 11. Téléchargement d'un transcript
  router.get('/transcripts/:ticketId/download', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const ticketId = String(req.params.ticketId);
    const ticket = ticketService.getTicketById(guildId, ticketId);

    if (ticket && ticket.transcriptPath && fs.existsSync(ticket.transcriptPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.sendFile(ticket.transcriptPath);
      return;
    }

    // Fallback recherche globale
    const transcriptsDir = path.resolve(process.cwd(), 'data', 'transcripts');
    if (fs.existsSync(transcriptsDir)) {
      const files = fs.readdirSync(transcriptsDir);
      const match = files.find((f) => f.includes(ticketId) && f.endsWith('.html'));
      if (match) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.sendFile(path.join(transcriptsDir, match));
        return;
      }
    }

    res.status(404).send('Transcript introuvable pour ce ticket.');
  });

  // 12. Catégories Discord du serveur
  router.get('/discord-categories', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.json({ categories: [] });
      return;
    }

    const discordCats = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildCategory)
      .map((c) => ({ id: c.id, name: c.name }));

    res.json({ categories: discordCats });
  });

  return router;
}
