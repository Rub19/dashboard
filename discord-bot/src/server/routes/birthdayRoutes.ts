import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';
import { birthdayStorage } from '../../modules/birthdays/storage/birthdayStorage.js';
import { BirthdayConfigSchema } from '../../modules/birthdays/types/birthday.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { DESTINATION_CHANNEL_TYPES, sendToConfiguredChannel } from '../../utils/channelSend.js';
import { baseEmbed } from '../../utils/embeds.js';
import { trq, trg } from '../../utils/tr.js';

/**
 * API Dashboard du module Birthdays.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createBirthdayRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    res.json(birthdayStorage.getOverview(String(req.params.guildId)));
  });

  router.get('/config', (req: Request, res: Response): void => {
    res.json(birthdayStorage.getConfig(String(req.params.guildId)));
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const allowed = BirthdayConfigSchema.partial().omit({
      guildId: true,
      updatedAt: true,
      lastAnnouncedDate: true,
      currentRoleHolders: true,
    });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: trq('Configuration invalide'), details: parsed.error.flatten() });
      return;
    }
    const updated = birthdayStorage.updateConfig(guildId, parsed.data);
    emitConfigUpdated('birthdays', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  router.get('/list', (req: Request, res: Response): void => {
    res.json({ birthdays: birthdayStorage.getGuildEntries(String(req.params.guildId)) });
  });

  router.delete('/:userId', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);
    const ok = birthdayStorage.delete(guildId, userId);
    res.json({ success: ok });
  });

  router.post('/test', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = birthdayStorage.getConfig(guildId);
    if (!config.announceChannelId) {
      res.status(400).json({ error: trq('Aucun salon d\'annonce configuré') });
      return;
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: trq('Serveur introuvable') });
      return;
    }
    const channel = await client.channels.fetch(config.announceChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      res.status(400).json({ error: trq('Salon d\'annonce introuvable ou inaccessible') });
      return;
    }
    const now = new Date();
    const testEmbed = baseEmbed('default', { color: '#FF6BAA' })
      .setTitle(trg(guild, '🎂 [TEST] Anniversaire du jour'))
      .setDescription(
        config.message
          .replaceAll('{user}', config.mentionUser && req.user?.id ? `<@${req.user.id}>` : `**${trg(guild, 'Membre Test')}**`)
          .replaceAll('{age}', '20')
          .replaceAll('{date}', `${now.getDate()}/${now.getMonth() + 1}`)
      );
    await sendToConfiguredChannel(
      channel as any,
      {
        content: config.mentionUser && req.user?.id ? `<@${req.user.id}>` : undefined,
        embeds: [testEmbed],
      },
      { postTitle: trg(guild, '🎂 [TEST] Anniversaire du jour') }
    );
    res.json({ success: true });
  });

  // Salons + rôles pour les sélecteurs du dashboard.
  router.get('/targets', (req: Request, res: Response): void => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [], roles: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => DESTINATION_CHANNEL_TYPES.includes(c.type))
      .map((c) => ({ id: c.id, name: c.name, type: c.type }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const botHighest = guild.members.me?.roles.highest.position ?? 0;
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed && r.position < botHighest)
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels, roles });
  });

  return router;
}
