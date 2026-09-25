import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { z } from 'zod';
import { secureRolesStorage as store } from '../../modules/secureroles/storage/secureRolesStorage.js';
import { inviteMember, resetMember, restoreRole, secureRole, endSession, sensitiveNames } from '../../modules/secureroles/services/secureRolesService.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

const snowflake = z.string().regex(/^\d{5,25}$/);

/** API Dashboard des rôles sécurisés (derrière authMiddleware + createGuildAuthMiddleware, cf. server/index.ts). */
export function createSecureRolesRouter(client: Client) {
  const router = express.Router({ mergeParams: true });
  const notify = (req: Request) => emitConfigUpdated('secureroles', String(req.params.guildId), store.getConfig(String(req.params.guildId)), 'DASHBOARD', req.user?.id);

  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable ou bot non connecté' });
      return;
    }
    const conf = store.getConfig(guildId);
    const securedIds = new Set(conf.roles.map((r) => r.roleId));
    const hiddenIds = new Set(conf.roles.map((r) => r.permissionsRoleId));
    const me = guild.members.me;

    const roles = [...guild.roles.cache.values()]
      .filter((r) => r.id !== guild.id && !r.managed && !hiddenIds.has(r.id))
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        memberCount: r.members.size,
        sensitive: sensitiveNames(r.permissions.bitfield),
        secured: securedIds.has(r.id),
        editable: r.editable,
      }));

    const holders = new Map<string, { userId: string; tag: string; displayName: string; avatar: string | null; roleNames: string[] }>();
    for (const s of conf.roles) {
      for (const m of guild.roles.cache.get(s.roleId)?.members.values() ?? []) {
        if (m.user.bot) continue;
        const cur = holders.get(m.id) ?? { userId: m.id, tag: m.user.username, displayName: m.displayName, avatar: m.displayAvatarURL({ size: 64 }), roleNames: [] };
        cur.roleNames.push(guild.roles.cache.get(s.roleId)?.name ?? s.roleId);
        holders.set(m.id, cur);
      }
    }
    const members = [...holders.values()].slice(0, 300).map((h) => {
      const rec = store.getMember(guildId, h.userId);
      const session = store.activeSessionFor(guildId, h.userId);
      return { ...h, status: rec?.status ?? 'none', invitedAt: rec?.invitedAt ?? null, enrolledAt: rec?.enrolledAt ?? null, lockedUntil: rec?.lockedUntil ?? null, sessionExpiresAt: session?.expiresAt ?? null };
    });

    const names = new Map(members.map((m) => [m.userId, m.displayName]));
    res.json({
      config: conf,
      roles,
      members,
      audit: store.getAudit(guildId, 100).map((a) => ({ ...a, userName: a.userId ? names.get(a.userId) ?? null : null })),
      bot: { canManageRoles: Boolean(me?.permissions.has('ManageRoles')), sensitiveNames: sensitiveNames(BigInt(me?.permissions.bitfield ?? 0n)) },
    });
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const parsed = z.object({ enabled: z.boolean(), sessionMinutes: z.number().int().min(5).max(240) }).partial().strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide' });
      return;
    }
    if (parsed.data.enabled === false && store.getConfig(guildId).roles.length > 0) {
      res.status(400).json({ error: 'Restaurez d’abord tous les rôles sécurisés : désactiver le module maintenant enfermerait votre équipe hors de ses permissions.' });
      return;
    }
    store.updateConfig(guildId, parsed.data);
    notify(req);
    res.json({ success: true, config: store.getConfig(guildId) });
  });

  router.post('/roles', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    const parsed = z.object({ roleId: snowflake }).strict().safeParse(req.body);
    if (!guild || !parsed.success) {
      res.status(400).json({ error: 'Requête invalide' });
      return;
    }
    try {
      const out = await secureRole(guild, parsed.data.roleId, req.user?.id ?? null);
      notify(req);
      res.status(201).json({ success: true, ...out });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Impossible de sécuriser ce rôle' });
    }
  });

  router.delete('/roles/:roleId', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild || !snowflake.safeParse(req.params.roleId).success) {
      res.status(400).json({ error: 'Requête invalide' });
      return;
    }
    try {
      await restoreRole(guild, String(req.params.roleId), req.user?.id ?? null);
      notify(req);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Impossible de restaurer ce rôle' });
    }
  });

  router.post('/members/:userId/invite', (req: Request, res: Response): void => {
    if (!snowflake.safeParse(req.params.userId).success) {
      res.status(400).json({ error: 'Membre invalide' });
      return;
    }
    try {
      inviteMember(String(req.params.guildId), String(req.params.userId), req.user?.id ?? null);
      notify(req);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invitation impossible' });
    }
  });

  router.post('/members/:userId/reset', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild || !snowflake.safeParse(req.params.userId).success) {
      res.status(400).json({ error: 'Requête invalide' });
      return;
    }
    await resetMember(guild, String(req.params.userId), req.user?.id ?? null);
    notify(req);
    res.json({ success: true });
  });

  router.post('/members/:userId/revoke', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    const session = guild ? store.activeSessionFor(guild.id, String(req.params.userId)) : undefined;
    if (!guild || !session) {
      res.status(404).json({ error: 'Aucune session en cours pour ce membre' });
      return;
    }
    await endSession(guild, session.id, 'manual');
    notify(req);
    res.json({ success: true });
  });

  return router;
}
