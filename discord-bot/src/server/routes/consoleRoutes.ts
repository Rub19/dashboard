import { Router, type Request, type Response } from 'express';
import type { Client, GuildMember, User } from 'discord.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { raidModeService } from '../../modules/antiRaid/services/raidModeService.js';
import { handleRouteError } from '../utils/routeError.js';
import { isModuleEnabled } from '../../services/moduleRegistry.js';

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

  return router;
}
