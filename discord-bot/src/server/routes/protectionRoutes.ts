import { Router, type Request, type Response } from 'express';
import { PermissionFlagsBits, type Client } from 'discord.js';
import { PROTECTIONS, PROTECTION_CATEGORIES, DEFAULT_WATCHED_PERMS, getProtection } from '../../modules/protections/catalog.js';
import { protectionStore, ProtectionSettingsSchema } from '../../modules/protections/protectionStore.js';
import { protectionEngine } from '../../modules/protections/protectionEngine.js';
import { syncAutomodRule } from '../../modules/protections/automodSync.js';
import { checkProtection } from '../../modules/protections/protectionCheck.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { handleRouteError } from '../utils/routeError.js';

/** Permissions dont Etho a besoin pour détecter et réparer (bandeau « Permission à vérifier »). */
const NEEDED: [keyof typeof PermissionFlagsBits, string][] = [
  ['ViewAuditLog', "Voir les logs du serveur"],
  ['ManageRoles', 'Gérer les rôles'],
  ['ManageChannels', 'Gérer les salons'],
  ['ManageGuild', 'Gérer le serveur'],
  ['ManageWebhooks', 'Gérer les webhooks'],
  ['ManageMessages', 'Gérer les messages'],
  ['ManageGuildExpressions', 'Gérer les expressions'],
  ['BanMembers', 'Bannir des membres'],
  ['KickMembers', 'Expulser des membres'],
  ['ModerateMembers', 'Exclure temporairement des membres'],
];

const PatchSchema = ProtectionSettingsSchema.partial().strict();

/** /api/guilds/:guildId/protections — page « Protections » de la console (format Keeper). */
export function createProtectionRouter(client: Client): Router {
  const router = Router({ mergeParams: true });
  const guildOf = (req: Request) => client.guilds.cache.get(String(req.params.guildId));

  const view = (guildId: string) => {
    const guild = client.guilds.cache.get(guildId);
    const me = guild?.members.me;
    return {
      categories: PROTECTION_CATEGORIES,
      catalog: PROTECTIONS,
      defaultWatchedPerms: DEFAULT_WATCHED_PERMS,
      settings: protectionStore.all(guildId),
      lockdown: protectionStore.getLockdown(guildId),
      lastBackupAt: protectionStore.getLastBackupAt(guildId),
      missingPermissions: me ? NEEDED.filter(([p]) => !me.permissions.has(PermissionFlagsBits[p])).map(([, label]) => label) : [],
    };
  };

  router.get('/', (req: Request, res: Response) => {
    try {
      res.json(view(String(req.params.guildId)));
    } catch (err) {
      handleRouteError(err, res, 'Erreur chargement des protections');
    }
  });

  router.patch('/:key', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    const key = String(req.params.key);
    if (!guild || !getProtection(key)) {
      res.status(404).json({ error: 'Protection ou serveur introuvable.' });
      return;
    }
    const parsed = PatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Réglage invalide : ' + parsed.error.issues.map((i) => i.path.join('.') || i.message).join(', ') });
      return;
    }
    // Les salons, rôles et membres doivent appartenir à ce serveur.
    const p = parsed.data;
    const badChannel = [p.logChannelId, ...(p.wlChannels ?? []), ...(p.wlCategories ?? [])].find((id) => id && !guild.channels.cache.has(id));
    const badRole = [...(p.mentionRoleIds ?? []), ...(p.wlRoles ?? []), ...(p.watchedRoles ?? [])].find((id) => !guild.roles.cache.has(id));
    if (badChannel || badRole) {
      res.status(400).json({ error: badChannel ? 'Salon introuvable sur ce serveur.' : 'Rôle introuvable sur ce serveur.' });
      return;
    }
    if (p.watchedPerms?.some((perm) => !(perm in PermissionFlagsBits))) {
      res.status(400).json({ error: 'Permission inconnue.' });
      return;
    }
    const updated = protectionStore.update(guild.id, key, p);
    emitConfigUpdated('protections', guild.id, { key, ...updated }, 'DASHBOARD', req.user?.id);
    const warning = key === 'antiLink' || key === 'antiBadWord' ? await syncAutomodRule(guild, key) : null;
    res.json({ settings: updated, warning });
  });

  // « Tester » : vérifie permissions, place du rôle d'Etho et salon de log (envoie un vrai message de test).
  router.post('/:key/test', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    const key = String(req.params.key);
    if (!guild || !getProtection(key)) {
      res.status(404).json({ error: 'Protection ou serveur introuvable.' });
      return;
    }
    try {
      res.json({ checks: await checkProtection(guild, key) });
    } catch (err) {
      handleRouteError(err, res, 'Test impossible');
    }
  });

  router.post('/lockdown/lift', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    const restored = await protectionEngine.liftLockdown(guild);
    res.json({ restored, ...view(guild.id) });
  });

  router.post('/rollback/now', async (req: Request, res: Response) => {
    const guild = guildOf(req);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    try {
      const backupId = await protectionEngine.backupNow(guild);
      res.json({ backupId, lastBackupAt: protectionStore.getLastBackupAt(guild.id) });
    } catch (err) {
      handleRouteError(err, res, 'Capture du serveur impossible');
    }
  });

  return router;
}
