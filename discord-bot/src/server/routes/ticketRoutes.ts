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
import { logger } from '../../utils/logger.js';

export function createTicketRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble & Stats
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const overview = ticketService.getOverview(guildId);
    res.json(overview);
  });

  // 2. Liste des tickets
  router.get('/list', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const tickets = ticketService.getGuildTickets(guildId);
    res.json({ tickets });
  });

  // 3. Catégories
  router.get('/categories', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const categories = ticketService.getCategories(guildId);
    res.json({ categories });
  });

  router.post('/categories', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const saved = ticketService.saveCategory(guildId, req.body);
      res.json({ success: true, category: saved });
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

  // 4. Panels
  router.get('/panels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panels = ticketService.getPanels(guildId);
    res.json({ panels });
  });

  router.post('/panels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const saved = ticketService.savePanel(guildId, req.body);
      res.json({ success: true, panel: saved });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  // 5. Publier un Panel dans un salon Discord
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
        panel.categoryIds.length > 0
          ? allCategories.filter((c) => panel.categoryIds.includes(c.id))
          : allCategories;

      const buttonsRow = new ActionRowBuilder<ButtonBuilder>();

      if (selectedCats.length === 1) {
        // Bouton unique
        const cat = selectedCats[0];
        buttonsRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_open:${cat.id}`)
            .setLabel(panel.buttonLabel || `Ouvrir un ticket (${cat.name})`)
            .setEmoji(cat.emoji || '🎫')
            .setStyle(ButtonStyle.Primary)
        );
      } else {
        // Plusieurs boutons (jusqu'à 5 boutons par ligne)
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

      // Mettre à jour le panel avec le messageId et channelId
      ticketService.savePanel(guildId, {
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

  // 6. Configuration globale des tickets
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = ticketService.getConfig(guildId);
    res.json({ config });
  });

  router.patch('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = ticketService.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  // 7. Téléchargement d'un transcript HTML
  router.get('/transcripts/:ticketId/download', async (req: Request, res: Response): Promise<void> => {
    const ticketId = String(req.params.ticketId);
    const filePath = path.resolve(process.cwd(), 'data', 'transcripts', `transcript-${ticketId}.html`);

    if (!fs.existsSync(filePath)) {
      res.status(404).send('Transcript introuvable.');
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(filePath);
  });

  // 8. Catégories Discord du serveur (pour regrouper les salons)
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
