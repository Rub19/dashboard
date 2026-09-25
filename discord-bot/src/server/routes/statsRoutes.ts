import express, { Request, Response } from 'express';
import { Client, Guild } from 'discord.js';
import { z } from 'zod';
import { statsStorage } from '../../modules/stats/storage/statsStorage.js';
import { statsQueries } from '../../modules/stats/services/statsQueries.js';
import { statsCollector } from '../../modules/stats/services/statsCollector.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import type { RankedEntry } from '../../modules/stats/types/stats.js';

const ALLOWED_DAYS = [7, 30, 60, 90, 180, 365];

function parseDays(raw: unknown): number {
  const n = Number(raw);
  return ALLOWED_DAYS.includes(n) ? n : 30;
}

/** Ajoute nom et avatar aux membres classés (ids inconnus : « Ancien membre »), et le nom aux salons. */
async function withMembers(guild: Guild | undefined, entries: RankedEntry[]) {
  return Promise.all(
    entries.map(async (e) => {
      const member = guild ? await guild.members.fetch(e.id).catch(() => null) : null;
      return { id: e.id, value: e.value, name: member?.displayName ?? 'Ancien membre', avatarUrl: member?.user.displayAvatarURL({ extension: 'png', size: 64 }) ?? null };
    })
  );
}

function withChannels(guild: Guild | undefined, entries: RankedEntry[]) {
  return entries.map((e) => ({ id: e.id, value: e.value, name: guild?.channels.cache.get(e.id)?.name ?? 'salon supprimé' }));
}

/** API Dashboard du module Statistiques (derrière authMiddleware + createGuildAuthMiddleware, cf. server/index.ts). */
export function createStatsRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/config', (req: Request, res: Response): void => {
    res.json({ config: statsStorage.getConfig(String(req.params.guildId)) });
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const parsed = z.object({ enabled: z.boolean() }).strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    const updated = statsStorage.updateConfig(guildId, { enabled: parsed.data.enabled });
    emitConfigUpdated('stats', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = client.guilds.cache.get(guildId);
    const days = parseDays(req.query.days);
    const summary = statsQueries.summary(guildId, days, 10);
    res.json({
      config: statsStorage.getConfig(guildId),
      days,
      totals: summary.totals,
      series: summary.series,
      voiceSessionsNow: statsCollector.activeVoiceSessions(),
      memberCount: guild?.memberCount ?? null,
      topMembersMessages: await withMembers(guild, summary.topMembersMessages),
      topMembersVoice: await withMembers(guild, summary.topMembersVoice),
      topChannelsMessages: withChannels(guild, summary.topChannelsMessages),
      topChannelsVoice: withChannels(guild, summary.topChannelsVoice),
    });
  });

  router.get('/member/:userId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);
    if (!/^\d{5,25}$/.test(userId)) {
      res.status(400).json({ error: 'Identifiant de membre invalide' });
      return;
    }
    const guild = client.guilds.cache.get(guildId);
    const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
    const stats = statsQueries.member(guildId, userId);
    res.json({
      member: member ? { id: userId, name: member.displayName, avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 128 }), joinedAt: member.joinedAt?.toISOString() ?? null, createdAt: member.user.createdAt.toISOString() } : { id: userId, name: 'Ancien membre', avatarUrl: null, joinedAt: null, createdAt: null },
      windows: stats.windows,
      rank: stats.rank,
      topChannels: withChannels(guild, stats.topChannels),
      topVoiceChannels: withChannels(guild, stats.topVoiceChannels),
      series: stats.series,
    });
  });

  router.get('/channel/:channelId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = client.guilds.cache.get(guildId);
    const channelId = String(req.params.channelId);
    const stats = statsQueries.channel(guildId, channelId, parseDays(req.query.days));
    res.json({
      channel: { id: channelId, name: guild?.channels.cache.get(channelId)?.name ?? 'salon supprimé' },
      days: stats.days,
      totals: stats.totals,
      series: stats.series,
      topMembersMessages: await withMembers(guild, stats.topMembersMessages),
      topMembersVoice: await withMembers(guild, stats.topMembersVoice),
    });
  });

  router.delete('/data', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    statsStorage.clearGuild(guildId);
    emitConfigUpdated('stats', guildId, statsStorage.getConfig(guildId), 'DASHBOARD', req.user?.id);
    res.json({ success: true });
  });

  return router;
}
