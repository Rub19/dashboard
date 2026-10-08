import { Router, type Request, type Response } from 'express';
import { PermissionFlagsBits, type Client, type GuildMember, type User } from 'discord.js';
import { raidConfigService } from '../../modules/antiRaid/services/raidConfigService.js';
import { securityStorage } from '../../modules/security/storage/securityStorage.js';
import { addToBlacklist, getBlacklist, isBlacklisted, removeFromBlacklist } from '../../services/blacklistService.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { raidModeService } from '../../modules/antiRaid/services/raidModeService.js';
import { handleRouteError } from '../utils/routeError.js';
import { isModuleEnabled, moduleForCommand } from '../../services/moduleRegistry.js';
import { commandRegistry } from '../../handlers/commandHandler.js';
import { CommandRuleSchema } from '../../types/guildConfig.js';
import { DEFAULT_RULE } from '../../services/commandRulesService.js';

/**
 * Pages « Réglages » et « Accès » de la console (format Keeper). Monté derrière createGuildAuthMiddleware :
 * req.guildAccess vaut 'owner', 'etho_owner' ou 'admin' (lecture seule).
 */

const SNOWFLAKE = /^\d{15,22}$/;

const personView = (u: User, member?: GuildMember | null) => ({
  id: u.id,
  username: u.username,
  displayName: member?.displayName ?? u.globalName ?? u.username,
  avatarUrl: (member ?? u).displayAvatarURL({ size: 64 }),
  bot: u.bot,
});

/** Tableau « Qui peut faire quoi » : reflète exactement createGuildAuthMiddleware et les gardes des routes. */
const PERMISSION_MATRIX = [
  { action: "Voir l'état et les logs", owner: true, ethoOwner: true, admin: true },
  { action: 'Régler les protections, la whitelist et la blacklist', owner: true, ethoOwner: true, admin: false },
  { action: 'Lancer un scan, modifier les réglages du serveur', owner: true, ethoOwner: true, admin: false },
  { action: 'Ajouter ou retirer des owners', owner: true, ethoOwner: false, admin: false },
];

export function createConsoleRouter(client: Client): Router {
  const router = Router({ mergeParams: true });
  const guildOf = (req: Request) => client.guilds.cache.get(String(req.params.guildId));

  // --- Accès ---------------------------------------------------------------------------------------------------
  router.get('/access', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    try {
      const ownerMember = await guild.fetchOwner().catch(() => null);
      const ids = guildConfigService.getConfig(guild.id).ethoOwners ?? [];
      const owners = [];
      if (ownerMember) owners.push({ ...personView(ownerMember.user, ownerMember), role: 'owner' as const });
      for (const id of ids) {
        if (id === ownerMember?.id) continue;
        const member = await guild.members.fetch(id).catch(() => null);
        const user = member?.user ?? (await client.users.fetch(id).catch(() => null));
        if (user) owners.push({ ...personView(user, member), role: 'etho_owner' as const, inServer: Boolean(member) });
      }
      res.json({ me: req.guildAccess ?? 'admin', owners, matrix: PERMISSION_MATRIX });
    } catch (err) {
      handleRouteError(err, res, 'Erreur chargement des accès');
    }
  });

  const requireGuildOwner = (req: Request, res: Response): boolean => {
    if (req.guildAccess === 'owner') return true;
    res.status(403).json({ error: 'Seul le propriétaire du serveur peut gérer les owners Etho.', code: 'OWNER_ONLY' });
    return false;
  };

  router.post('/access/owners', async (req: Request, res: Response) => {
    if (!requireGuildOwner(req, res)) return;
    const guild = guildOf(req);
    const userId = String(req.body?.userId ?? '');
    if (!guild || !SNOWFLAKE.test(userId)) {
      res.status(400).json({ error: 'Membre invalide.' });
      return;
    }
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      res.status(404).json({ error: 'Ce membre n\'est pas sur le serveur.' });
      return;
    }
    if (member.user.bot) {
      res.status(400).json({ error: 'Un bot ne peut pas être owner Etho.' });
      return;
    }
    const current = guildConfigService.getConfig(guild.id).ethoOwners ?? [];
    if (!current.includes(userId) && userId !== guild.ownerId) {
      guildConfigService.updateConfig(guild.id, { ethoOwners: [...current, userId] });
    }
    res.json({ success: true });
  });

  router.delete('/access/owners/:userId', (req: Request, res: Response) => {
    if (!requireGuildOwner(req, res)) return;
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    const current = guildConfigService.getConfig(guild.id).ethoOwners ?? [];
    guildConfigService.updateConfig(guild.id, { ethoOwners: current.filter((id) => id !== String(req.params.userId)) });
    res.json({ success: true });
  });

  // --- Recherche de membres (sélecteurs « Ajouter ») ------------------------------------------------------------
  router.get('/members/search', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    const q = String(req.query.q ?? '').trim();
    if (!guild || q.length < 2) {
      res.json({ members: [] });
      return;
    }
    try {
      if (SNOWFLAKE.test(q)) {
        const m = await guild.members.fetch(q).catch(() => null);
        res.json({ members: m ? [personView(m.user, m)] : [] });
        return;
      }
      const found = await guild.members.search({ query: q, limit: 15 }).catch(() => null);
      const lower = q.toLowerCase();
      const list = found
        ? [...found.values()]
        : [...guild.members.cache.values()]
            .filter((m) => m.user.username.toLowerCase().includes(lower) || m.displayName.toLowerCase().includes(lower))
            .slice(0, 15);
      res.json({ members: list.map((m) => personView(m.user, m)) });
    } catch (err) {
      handleRouteError(err, res, 'Erreur recherche de membres');
    }
  });

  // --- Réglages ------------------------------------------------------------------------------------------------
  router.get('/settings', (req: Request, res: Response) => {
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    const conf = guildConfigService.getConfig(guild.id);
    res.json({
      prefix: conf.prefix,
      systemChannelId: conf.systemChannelId ?? null,
      ownerDmAlerts: Boolean(conf.ownerDmAlerts),
      raidModeActive: raidModeService.isRaidModeActive(guild.id),
      antiRaidEnabled: isModuleEnabled(guild.id, 'security'),
    });
  });

  router.patch('/settings', (req: Request, res: Response) => {
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    const { prefix, systemChannelId, ownerDmAlerts } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (prefix !== undefined) {
      if (typeof prefix !== 'string' || !prefix.trim() || prefix.length > 5 || /\s/.test(prefix)) {
        res.status(400).json({ error: 'Préfixe invalide (1 à 5 caractères, sans espace).' });
        return;
      }
      patch.prefix = prefix;
    }
    if (systemChannelId !== undefined) {
      if (systemChannelId !== null && !guild.channels.cache.get(String(systemChannelId))?.isTextBased()) {
        res.status(400).json({ error: 'Salon système introuvable ou non textuel.' });
        return;
      }
      patch.systemChannelId = systemChannelId;
    }
    if (ownerDmAlerts !== undefined) patch.ownerDmAlerts = ownerDmAlerts === true;
    const conf = guildConfigService.updateConfig(guild.id, patch);
    res.json({ prefix: conf.prefix, systemChannelId: conf.systemChannelId ?? null, ownerDmAlerts: Boolean(conf.ownerDmAlerts) });
  });


  // --- Commandes ------------------------------------------------------------------------------------------------
  router.get('/commands', (req: Request, res: Response) => {
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    const rules = guildConfigService.getConfig(guild.id).commandRules ?? {};
    const commands = commandRegistry
      .getAllCommands()
      .map((c) => {
        const mod = moduleForCommand(c.name);
        return {
          name: c.name,
          description: c.description,
          category: c.category ?? 'Général',
          module: mod ? { id: mod.id, label: mod.label, enabled: isModuleEnabled(guild.id, mod.id) } : null,
          rule: rules[c.name] ?? DEFAULT_RULE,
          customized: Boolean(rules[c.name]),
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category, 'fr') || a.name.localeCompare(b.name));
    res.json({ commands, defaults: DEFAULT_RULE });
  });

  router.patch('/commands/:name', (req: Request, res: Response) => {
    const guild = guildOf(req);
    const name = String(req.params.name).toLowerCase();
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    if (!commandRegistry.getAllCommands().some((c) => c.name === name)) {
      res.status(404).json({ error: 'Commande inconnue.' });
      return;
    }
    const rules = { ...(guildConfigService.getConfig(guild.id).commandRules ?? {}) };
    const body = { ...(req.body ?? {}) };
    for (const k of ['allowedRoles', 'deniedRoles', 'allowedChannels'] as const) {
      if (body[k] !== undefined) {
        if (!Array.isArray(body[k]) || body[k].some((id: unknown) => typeof id !== 'string' || !SNOWFLAKE.test(id))) {
          res.status(400).json({ error: 'Identifiants invalides.' });
          return;
        }
        body[k] = [...new Set(body[k] as string[])];
      }
    }
    const parsed = CommandRuleSchema.safeParse({ ...(rules[name] ?? DEFAULT_RULE), ...body });
    if (!parsed.success) {
      res.status(400).json({ error: 'Règle invalide : ' + parsed.error.issues.map((i) => i.path.join('.')).join(', ') });
      return;
    }
    // Revenue aux valeurs d'origine : on retire la règle plutôt que de stocker un doublon des valeurs par défaut.
    if (JSON.stringify(parsed.data) === JSON.stringify(DEFAULT_RULE)) delete rules[name];
    else rules[name] = parsed.data;
    guildConfigService.updateConfig(guild.id, { commandRules: rules }, { source: 'DASHBOARD', actorId: req.user?.id });
    res.json({ rule: rules[name] ?? DEFAULT_RULE, customized: Boolean(rules[name]) });
  });

  // --- Whitelist -------------------------------------------------------------------------------------------------
  // Deux listes de confiance existent : celle de l'anti-raid et celle de l'anti-nuke. « Globale » = présent dans les
  // deux ; « Par protection » = présent dans une seule.
  type WlKind = 'user' | 'role';
  const wlLists = (guildId: string) => {
    const raid = raidConfigService.getConfig(guildId).whitelist;
    const nuke = securityStorage.getConfig(guildId).whitelist;
    return {
      raid: { user: [...new Set([...raid.trustedUserIds, ...raid.trustedBotIds])], role: raid.trustedRoleIds },
      nuke: { user: [...new Set([...nuke.trustedUserIds, ...nuke.trustedBotIds])], role: nuke.trustedRoleIds },
    };
  };

  const describe = async (guildId: string, id: string, kind: WlKind) => {
    const guild = client.guilds.cache.get(guildId);
    if (kind === 'role') {
      const role = guild?.roles.cache.get(id);
      return { id, kind, name: role ? `@${role.name}` : `Rôle supprimé (${id})`, color: role?.hexColor ?? null, avatarUrl: null, bot: false };
    }
    const member = await guild?.members.fetch(id).catch(() => null);
    const user = member?.user ?? (await client.users.fetch(id).catch(() => null));
    return {
      id,
      kind,
      name: member?.displayName ?? user?.globalName ?? user?.username ?? id,
      color: null,
      avatarUrl: user ? (member ?? user).displayAvatarURL({ size: 64 }) : null,
      bot: Boolean(user?.bot),
    };
  };

  router.get('/whitelist', async (req: Request, res: Response) => {
    const guildId = String(req.params.guildId);
    try {
      const l = wlLists(guildId);
      const both = (k: WlKind) => l.raid[k].filter((id) => l.nuke[k].includes(id));
      const only = (a: string[], b: string[]) => a.filter((id) => !b.includes(id));
      const out = async (ids: string[], kind: WlKind) => Promise.all(ids.map((id) => describe(guildId, id, kind)));
      res.json({
        global: [...(await out(both('user'), 'user')), ...(await out(both('role'), 'role'))],
        perProtection: [
          { protection: 'anti-raid', label: 'Anti-raid', entries: [...(await out(only(l.raid.user, l.nuke.user), 'user')), ...(await out(only(l.raid.role, l.nuke.role), 'role'))] },
          { protection: 'anti-nuke', label: 'Anti-nuke', entries: [...(await out(only(l.nuke.user, l.raid.user), 'user')), ...(await out(only(l.nuke.role, l.raid.role), 'role'))] },
        ],
      });
    } catch (err) {
      handleRouteError(err, res, 'Erreur chargement de la whitelist');
    }
  });

  const setWhitelisted = async (guildId: string, id: string, kind: WlKind, scope: 'global' | 'anti-raid' | 'anti-nuke', add: boolean) => {
    const guild = client.guilds.cache.get(guildId);
    const isBot = kind === 'user' && Boolean((await guild?.members.fetch(id).catch(() => null))?.user.bot);
    const edit = (list: string[]) => (add ? [...new Set([...list, id])] : list.filter((x) => x !== id));
    if (scope === 'global' || scope === 'anti-raid') {
      const w = raidConfigService.getConfig(guildId).whitelist;
      raidConfigService.updateWhitelist(
        guildId,
        kind === 'role' ? { trustedRoleIds: edit(w.trustedRoleIds) } : isBot ? { trustedBotIds: edit(w.trustedBotIds), trustedUserIds: w.trustedUserIds.filter((x) => add || x !== id) } : { trustedUserIds: edit(w.trustedUserIds), trustedBotIds: w.trustedBotIds.filter((x) => add || x !== id) }
      );
    }
    if (scope === 'global' || scope === 'anti-nuke') {
      const cfg = securityStorage.getConfig(guildId);
      const w = cfg.whitelist;
      securityStorage.updateConfig(guildId, {
        whitelist: {
          ...w,
          ...(kind === 'role' ? { trustedRoleIds: edit(w.trustedRoleIds) } : isBot ? { trustedBotIds: edit(w.trustedBotIds), trustedUserIds: w.trustedUserIds.filter((x) => add || x !== id) } : { trustedUserIds: edit(w.trustedUserIds), trustedBotIds: w.trustedBotIds.filter((x) => add || x !== id) }),
        },
      });
    }
  };

  const parseWl = (req: Request, res: Response) => {
    const id = String(req.body?.id ?? req.params.id ?? '');
    const kind = (req.body?.kind ?? req.query.kind) === 'role' ? 'role' : 'user';
    const scope = String(req.body?.scope ?? req.query.scope ?? 'global');
    if (!SNOWFLAKE.test(id) || !['global', 'anti-raid', 'anti-nuke'].includes(scope)) {
      res.status(400).json({ error: 'Entrée de whitelist invalide.' });
      return null;
    }
    return { id, kind: kind as WlKind, scope: scope as 'global' | 'anti-raid' | 'anti-nuke' };
  };

  router.post('/whitelist', async (req: Request, res: Response) => {
    const p = parseWl(req, res);
    if (!p) return;
    await setWhitelisted(String(req.params.guildId), p.id, p.kind, p.scope, true);
    res.json({ success: true });
  });

  router.delete('/whitelist/:id', async (req: Request, res: Response) => {
    const p = parseWl(req, res);
    if (!p) return;
    await setWhitelisted(String(req.params.guildId), p.id, p.kind, p.scope, false);
    res.json({ success: true });
  });

  // --- Blacklist -------------------------------------------------------------------------------------------------
  router.get('/blacklist', async (req: Request, res: Response) => {
    const guildId = String(req.params.guildId);
    const entries = await Promise.all(
      getBlacklist(guildId).map(async (e) => {
        const user = await client.users.fetch(e.userId).catch(() => null);
        return { ...e, name: user?.globalName ?? user?.username ?? e.userId, username: user?.username ?? null, avatarUrl: user?.displayAvatarURL({ size: 64 }) ?? null };
      })
    );
    res.json({ entries });
  });

  router.post('/blacklist', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    const userId = String(req.body?.userId ?? '');
    if (!guild || !SNOWFLAKE.test(userId)) {
      res.status(400).json({ error: 'Compte invalide.' });
      return;
    }
    if (userId === guild.ownerId || userId === client.user?.id) {
      res.status(400).json({ error: 'Ce compte ne peut pas être blacklisté.' });
      return;
    }
    const result = await addToBlacklist(guild, userId, String(req.body?.reason ?? ''), req.user?.id ?? null);
    res.json({ success: true, ...result });
  });

  router.delete('/blacklist/:userId', (req: Request, res: Response) => {
    removeFromBlacklist(String(req.params.guildId), String(req.params.userId));
    res.json({ success: true, note: 'Retiré de la blacklist. Un ban déjà posé reste en place sur Discord.' });
  });

  // --- Rôles et membres ----------------------------------------------------------------------------------------
  const DANGEROUS_PERMS: Array<[bigint, string]> = [
    [PermissionFlagsBits.Administrator, 'Administrateur'],
    [PermissionFlagsBits.ManageGuild, 'Gérer le serveur'],
    [PermissionFlagsBits.ManageRoles, 'Gérer les rôles'],
    [PermissionFlagsBits.ManageChannels, 'Gérer les salons'],
    [PermissionFlagsBits.ManageWebhooks, 'Gérer les webhooks'],
    [PermissionFlagsBits.BanMembers, 'Bannir des membres'],
    [PermissionFlagsBits.KickMembers, 'Expulser des membres'],
    [PermissionFlagsBits.ModerateMembers, 'Exclure temporairement'],
    [PermissionFlagsBits.MentionEveryone, 'Mentionner tout le monde'],
  ];
  const dangerousOf = (perms: { has: (f: bigint) => boolean }) =>
    perms.has(PermissionFlagsBits.Administrator) ? ['Administrateur'] : DANGEROUS_PERMS.filter(([f]) => perms.has(f)).map(([, l]) => l);

  router.get('/roles', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    const myTop = guild.members.me?.roles.highest.position ?? 0;
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id && dangerousOf(r.permissions).length > 0)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color ? r.hexColor : null,
        managed: r.managed,
        permissions: dangerousOf(r.permissions),
        aboveEtho: r.position >= myTop,
        memberCount: r.members.size,
      }));
    res.json({ roles, aboveEthoCount: roles.filter((r) => r.aboveEtho).length });
  });

  router.get('/members/:userId/inspect', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    const userId = String(req.params.userId);
    if (!guild || !SNOWFLAKE.test(userId)) {
      res.status(400).json({ error: 'Membre invalide.' });
      return;
    }
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      res.status(404).json({ error: 'Ce membre n\'est pas sur le serveur.' });
      return;
    }
    const me = guild.members.me;
    const raidWl = raidConfigService.getConfig(guild.id).whitelist;
    const nukeWl = securityStorage.getConfig(guild.id).whitelist;
    res.json({
      ...personView(member.user, member),
      joinedAt: member.joinedAt?.toISOString() ?? null,
      createdAt: member.user.createdAt.toISOString(),
      isOwner: member.id === guild.ownerId,
      etho: { canAct: Boolean(me && member.roles.highest.position < me.roles.highest.position && member.id !== guild.ownerId) },
      roles: member.roles.cache
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => ({ id: r.id, name: r.name, color: r.color ? r.hexColor : null })),
      permissions: dangerousOf(member.permissions),
      whitelisted: {
        antiRaid: raidWl.trustedUserIds.includes(member.id) || raidWl.trustedBotIds.includes(member.id),
        antiNuke: nukeWl.trustedUserIds.includes(member.id) || nukeWl.trustedBotIds.includes(member.id),
      },
      blacklisted: Boolean(isBlacklisted(guild.id, member.id)),
    });
  });
  return router;
}
