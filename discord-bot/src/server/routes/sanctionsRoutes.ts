import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { z } from 'zod';
import { moderationRepository } from '../../modules/moderation/storage/moderationRepository.js';
import { memberEvents } from '../../modules/moderation/storage/memberEvents.js';
import { sanctionConfig } from '../../modules/moderation/sanctionConfig.js';
import { ACTION_LABEL, applySanction, isOpen } from '../../modules/moderation/services/sanctionPipeline.js';
import { appealService } from '../../modules/moderation/services/appealService.js';
import { CaseService } from '../../modules/moderation/services/caseService.js';
import { ModerationService } from '../../modules/moderation/services/moderationService.js';
import { reportsService } from '../../modules/reports/services/reportsService.js';
import type { ModerationCase } from '../../modules/moderation/types/case.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { trq } from '../../utils/tr.js';

const ORIGIN = (c: ModerationCase) => (c.source === 'MANUAL' ? 'moderators' : c.source === 'DISCORD' ? 'discord' : 'auto');
const OPEN_REPORT = ['NEW', 'REVIEWING', 'ESCALATED'];

function view(c: ModerationCase) {
  return {
    caseNumber: c.caseNumber,
    action: c.action,
    label: ACTION_LABEL[c.action],
    userId: c.userId,
    userTag: c.userTag,
    moderatorId: c.moderatorId,
    moderatorTag: c.moderatorTag,
    reason: c.reason,
    context: c.context ?? null,
    severity: c.severity ?? null,
    points: c.points ?? null,
    durationSeconds: c.durationSeconds ?? null,
    createdAt: c.createdAt,
    expiresAt: c.expiresAt ?? null,
    open: isOpen(c),
    status: c.status,
    origin: ORIGIN(c),
    appealStatus: c.appealStatus,
  };
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Sanctions façon Keeper : dossiers, avertissements et paliers, raisons, appels, signalements, statistiques. */
export function createSanctionsRouter(client: Client) {
  const router = express.Router({ mergeParams: true });
  const gid = (req: Request) => String(req.params.guildId);

  router.get('/config', (req, res) => {
    res.json({ config: sanctionConfig.get(gid(req)) });
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guild = client.guilds.cache.get(gid(req));
    const body = req.body ?? {};
    const roles = [...(body.appeals?.deciderRoleIds ?? []), ...(body.appeals?.mentionRoleIds ?? []), ...(body.presets?.reasons ?? []).flatMap((p: { roleIds?: string[] }) => p.roleIds ?? [])];
    const channels = [body.appeals?.channelId, body.guard?.alertChannelId].filter(Boolean);
    if (roles.some((id: string) => !guild?.roles.cache.has(id)) || channels.some((id: string) => !guild?.channels.cache.has(id))) {
      res.status(400).json({ error: trq('Rôle ou salon introuvable sur ce serveur') });
      return;
    }
    try {
      const next = sanctionConfig.update(gid(req), body);
      emitConfigUpdated('sanctions', gid(req), next, 'DASHBOARD', req.user?.id);
      res.json({ config: next });
    } catch (err: any) {
      res.status(400).json({ error: trq('Réglages invalides'), details: err?.issues?.slice?.(0, 3) });
    }
  });

  router.get('/cases', (req: Request, res: Response): void => {
    const q = req.query;
    const now = Date.now();
    const since = Number(q.since) > 0 ? now - Number(q.since) * 1000 : 0;
    const search = String(q.q ?? '').trim().toLowerCase().replace(/^#/, '');
    let list = moderationRepository.allCases(gid(req));
    if (q.status === 'open') list = list.filter((c) => isOpen(c, now));
    if (q.status === 'closed') list = list.filter((c) => !isOpen(c, now));
    if (q.type) list = list.filter((c) => c.action === q.type);
    if (q.origin) list = list.filter((c) => ORIGIN(c) === q.origin);
    if (since) list = list.filter((c) => Date.parse(c.createdAt) >= since);
    if (q.user) list = list.filter((c) => c.userId === q.user);
    if (search) list = list.filter((c) => String(c.caseNumber) === search || c.userId === search || c.userTag.toLowerCase().includes(search) || c.reason.toLowerCase().includes(search) || c.moderatorTag.toLowerCase().includes(search));
    const rows = list.map(view);
    if (q.format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="sanctions-${gid(req)}.json"`);
      res.json(rows);
      return;
    }
    if (q.format === 'csv') {
      const cols = ['caseNumber', 'label', 'userTag', 'userId', 'moderatorTag', 'reason', 'severity', 'points', 'durationSeconds', 'createdAt', 'expiresAt', 'open', 'origin'] as const;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sanctions-${gid(req)}.csv"`);
      res.send(`﻿${cols.join(';')}\n${rows.map((r) => cols.map((k) => csvCell(r[k])).join(';')).join('\n')}`);
      return;
    }
    const size = 20;
    const page = Math.max(1, Number(q.page) || 1);
    res.json({ total: rows.length, page, pages: Math.max(1, Math.ceil(rows.length / size)), cases: rows.slice((page - 1) * size, page * size) });
  });

  router.get('/cases/:n', (req: Request, res: Response): void => {
    const c = moderationRepository.getCaseByNumber(gid(req), Number(req.params.n));
    if (!c) {
      res.status(404).json({ error: trq('Dossier introuvable') });
      return;
    }
    const cfg = sanctionConfig.get(gid(req));
    res.json({
      case: view(c),
      history: moderationRepository.getUserCases(gid(req), c.userId).filter((x) => x.caseNumber !== c.caseNumber).slice(0, 25).map(view),
      events: cfg.history.joins ? memberEvents.get(gid(req), c.userId).slice(-20).reverse() : [],
      appeal: appealService.forGuild(gid(req)).find((a) => a.caseNumber === c.caseNumber) ?? null,
    });
  });

  router.post('/cases', async (req: Request, res: Response): Promise<void> => {
    const parsed = z
      .object({
        userId: z.string().regex(/^\d{15,25}$/),
        action: z.enum(['WARN', 'NOTE', 'TIMEOUT', 'KICK', 'TEMPBAN', 'BAN', 'SOFTBAN', 'UNBAN', 'UNTIMEOUT']),
        reason: z.string().max(500).default(''),
        context: z.string().max(1000).optional(),
        severity: z.enum(['light', 'medium', 'grave']).optional(),
        durationSeconds: z.number().int().min(60).max(365 * 86400).optional(),
        presetId: z.string().max(40).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: trq('Sanction invalide') });
      return;
    }
    const d = parsed.data;
    const cfg = sanctionConfig.get(gid(req));
    const preset = d.presetId ? cfg.presets.reasons.find((p) => p.id === d.presetId) : undefined;
    if (!d.reason.trim() && !preset && d.action === 'WARN' && cfg.replies.requireReason) {
      res.status(400).json({ error: trq('Une raison est obligatoire pour avertir sur ce serveur.') });
      return;
    }
    const mod = req.user?.id ? await client.users.fetch(req.user.id).catch(() => null) : null;
    const r = await applySanction(client, {
      guildId: gid(req),
      userId: d.userId,
      moderator: { id: req.user?.id ?? 'dashboard', tag: mod?.tag ?? req.user?.username ?? 'Dashboard' },
      action: d.action,
      reason: d.reason.trim() || preset?.memberReason || preset?.name || 'Aucune raison précisée',
      context: d.context?.trim() || undefined,
      severity: d.severity ?? preset?.severity,
      points: preset?.points ?? undefined,
      expiryDays: preset?.expiryDays ?? undefined,
      durationSeconds: d.durationSeconds ?? preset?.durationSeconds,
      presetId: preset?.id,
    });
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ case: view(r.case) });
  });

  router.post('/cases/:n/revoke', async (req: Request, res: Response): Promise<void> => {
    const mod = req.user?.id ? await client.users.fetch(req.user.id).catch(() => null) : null;
    const r = CaseService.revertCase(client, gid(req), Number(req.params.n), { id: req.user?.id ?? 'dashboard', tag: mod?.tag ?? 'Dashboard' }, String(req.body?.reason ?? 'Levée depuis le dashboard').slice(0, 300));
    if (!r.success || !r.case) {
      res.status(400).json({ error: r.error ?? 'Levée impossible' });
      return;
    }
    res.json({ case: view(r.case) });
  });

  router.get('/appeals', (req, res) => {
    res.json({ appeals: appealService.forGuild(gid(req)) });
  });

  router.post('/appeals/:id/decide', async (req: Request, res: Response): Promise<void> => {
    const mod = req.user?.id ? await client.users.fetch(req.user.id).catch(() => null) : null;
    const r = await appealService.decide(client, gid(req), String(req.params.id), req.body?.accept === true, { id: req.user?.id ?? 'dashboard', tag: mod?.tag ?? 'Dashboard' });
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ appeal: r.appeal });
  });

  router.get('/reports', (req, res) => {
    const all = moderationRepository.getReports(gid(req), {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ open: all.filter((r) => OPEN_REPORT.includes(r.status)), done: all.filter((r) => !OPEN_REPORT.includes(r.status)).slice(0, 50) });
  });

  router.post('/reports/:userId/close', async (req: Request, res: Response): Promise<void> => {
    const status = req.body?.status === 'DISMISSED' ? 'DISMISSED' : 'ACTIONED';
    const guild = client.guilds.cache.get(gid(req));
    const mod = req.user?.id ? await client.users.fetch(req.user.id).catch(() => null) : null;
    const who = { id: req.user?.id ?? 'dashboard', tag: mod?.tag ?? 'Dashboard' };
    const reports = moderationRepository.getReports(gid(req), { reportedUserId: String(req.params.userId) }).filter((r) => OPEN_REPORT.includes(r.status));
    if (!guild || !reports.length) {
      res.status(404).json({ error: trq('Aucun signalement en cours pour ce membre') });
      return;
    }
    for (const r of reports) ModerationService.updateReportStatus(gid(req), r.id, status, who);
    await reportsService.post(guild, String(req.params.userId)).catch(() => null);
    await reportsService.notifyClosed(guild, reports, status, who).catch(() => null);
    res.json({ ok: true });
  });

  router.get('/stats', (req: Request, res: Response): void => {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
    const now = Date.now();
    const since = now - days * 86400_000;
    const list = moderationRepository.allCases(gid(req)).filter((c) => Date.parse(c.createdAt) >= since);
    const perDay = Array.from({ length: days }, (_, i) => {
      const day = new Date(now - (days - 1 - i) * 86400_000).toISOString().slice(0, 10);
      return { day, count: list.filter((c) => c.createdAt.slice(0, 10) === day).length };
    });
    const tally = <K extends string>(items: K[]) => Object.entries(items.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
    const manual = list.filter((c) => c.source === 'MANUAL' || c.source === 'DISCORD');
    res.json({
      days,
      total: list.length,
      automatic: list.filter((c) => ORIGIN(c) === 'auto').length,
      reportsOpen: moderationRepository.getReports(gid(req), {}).filter((r) => OPEN_REPORT.includes(r.status)).length,
      appealsPending: appealService.pendingCount(gid(req)),
      perDay,
      byType: tally(list.map((c) => c.action)).map(([action, count]) => ({ action, label: ACTION_LABEL[action as ModerationCase['action']] ?? action, count })),
      moderators: tally(manual.map((c) => c.moderatorId)).slice(0, 10).map(([id, count]) => ({ id, tag: manual.find((c) => c.moderatorId === id)!.moderatorTag, count })),
      members: tally(list.map((c) => c.userId)).slice(0, 10).map(([id, count]) => ({ id, tag: list.find((c) => c.userId === id)!.userTag, count })),
    });
  });

  return router;
}
