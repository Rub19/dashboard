import express, { Request, Response } from 'express';
import { ChannelType, Client, PermissionFlagsBits } from 'discord.js';
import { welcomeService } from '../../modules/welcome/services/welcomeService.js';
import { welcomeRepository } from '../../modules/welcome/storage/welcomeRepository.js';
import { PREBUILT_TEMPLATES } from '../../modules/welcome/types/templates.js';
import { OnboardingFlowSchema } from '../../modules/welcome/types/onboarding.js';
import { OnboardingRunner } from '../../modules/welcome/services/onboardingRunner.js';
import { WelcomeCardGenerator } from '../../modules/welcome/images/welcomeCardGenerator.js';
import { WelcomeImageConfigSchema } from '../../modules/welcome/types/welcomeConfig.js';
import { VariableContext } from '../../modules/welcome/types/variables.js';
import { logger } from '../../utils/logger.js';
import { rateLimit, idempotent, guildLock } from '../middleware/antiAbuseMiddleware.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { handleRouteError, handleClientError, clientErrorMessage } from '../utils/routeError.js';
import { DESTINATION_CHANNEL_TYPES, canBotSendTo } from '../../utils/channelSend.js';

export function createWelcomeRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Récupérer la configuration Welcome & Goodbye
  router.get('/', rateLimit('READ'), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = welcomeService.getConfig(guildId);
    res.json({ config });
  });

  // 2. Mettre à jour la configuration Welcome & Goodbye
  const handleUpdateConfig = async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = welcomeService.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      handleClientError(err, res, 'Données invalides');
    }
  };

  router.patch('/', rateLimit('CONFIG', { byGuild: true }), idempotent(), handleUpdateConfig);
  router.put('/', rateLimit('CONFIG', { byGuild: true }), idempotent(), handleUpdateConfig);

  // 3. Vue d'ensemble, métriques & Funnel
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const overview = welcomeRepository.getOverview(guildId);
      res.json(overview);
    } catch (err: any) {
      handleRouteError(err, res, 'Erreur overview');
    }
  });

  // 4. Envoyer un message de test réel sur Discord (en salon ou en MP)
  router.post(
    '/test',
    rateLimit('SENSITIVE', { byGuild: true, actionName: 'welcome_test_send' }),
    idempotent(),
    async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { type, target } = req.body; // type: 'welcome' | 'goodbye', target: 'channel' | 'dm'

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur Discord introuvable' });
      return;
    }

    try {
      const result = await welcomeService.sendTest(
        guild,
        type === 'goodbye' ? 'goodbye' : 'welcome',
        target === 'dm' ? 'dm' : 'channel'
      );
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur lors du test Welcome :', err);
      res.status(Number(err?.status) || 500).json({ error: clientErrorMessage(err, 'Échec de l’envoi du test sur Discord') });
    }
  });

  // 5. Onboarding Flow
  router.get('/onboarding', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const flow = welcomeRepository.getOnboardingFlow(guildId);
    res.json({ flow });
  });

  router.put('/onboarding', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      // Validation (avant, le corps était enregistré tel quel) et numérotation des étapes selon leur
      // position dans la liste : c'est l'ordre choisi dans l'éditeur qui fait foi.
      const parsed = OnboardingFlowSchema.parse({ ...req.body, guildId });
      const steps = parsed.steps.map((s, i) => ({ ...s, order: i }));
      const flow = { ...parsed, steps };
      welcomeRepository.saveOnboardingFlow(guildId, flow);
      emitConfigUpdated('welcome', guildId, { onboarding: flow }, 'DASHBOARD', req.user?.id);
      res.json({ success: true, flow });
    } catch (err: any) {
      const issues = Array.isArray(err?.issues) ? err.issues.map((i: { path: unknown[]; message: string }) => `${i.path.join('.')} : ${i.message}`).join(' ; ') : '';
      res.status(400).json({ error: issues || clientErrorMessage(err, 'Données onboarding invalides') });
    }
  });

  // POST /api/guilds/:guildId/welcome/onboarding/preview
  // Envoie à l'utilisateur connecté au dashboard (s'il est membre du serveur) le parcours tel que le
  // verrait un nouvel arrivant — même si le parcours n'est pas encore activé.
  router.post('/onboarding/preview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Session du bot requise.' });
      return;
    }
    try {
      const guild = discordClient.guilds.cache.get(guildId);
      const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
      if (!guild || !member) {
        res.status(404).json({ error: 'Tu dois être membre de ce serveur pour recevoir l\'aperçu.' });
        return;
      }
      const flow = welcomeRepository.getOnboardingFlow(guildId);
      const via = await OnboardingRunner.start(member, { ...flow, enabled: true });
      if (via === 'none') {
        res.status(409).json({
          success: false,
          via,
          error: 'Impossible de t\'envoyer l\'aperçu : tes messages privés sont fermés et aucun salon de secours n\'est configuré.',
        });
        return;
      }
      res.json({ success: true, via });
    } catch (err: any) {
      logger.error('Erreur welcome/onboarding/preview :', err);
      res.status(500).json({ error: 'Aperçu impossible.' });
    }
  });

  // 6. Verification Config
  router.get('/verification', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const verification = welcomeRepository.getVerificationConfig(guildId);
    res.json({ verification });
  });

  router.put('/verification', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      welcomeRepository.saveVerificationConfig(guildId, { ...req.body, guildId });
      emitConfigUpdated('welcomeVerification', guildId, req.body, 'DASHBOARD', req.user?.id);
      res.json({ success: true, verification: req.body });
    } catch (err: any) {
      handleClientError(err, res, 'Données de vérification invalides');
    }
  });

  // 7. Templates préconçus
  router.get('/templates', async (req: Request, res: Response): Promise<void> => {
    res.json({ templates: PREBUILT_TEMPLATES });
  });

  router.post('/templates/apply', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { templateId } = req.body;

    const tpl = PREBUILT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) {
      res.status(404).json({ error: 'Template introuvable' });
      return;
    }

    try {
      const updated = welcomeService.updateConfig(guildId, tpl.config);
      res.json({ success: true, config: updated, templateName: tpl.name });
    } catch (err: any) {
      handleRouteError(err, res, 'Erreur serveur');
    }
  });

  // 8. Analytics & Funnel
  router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const overview = welcomeRepository.getOverview(guildId);
    res.json(overview);
  });

  // 9. Salons textuels avec vérification de permissions bot
  router.get('/channels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.json({ channels: [] });
      return;
    }

    const botMember = guild.members.me;
    const channels = guild.channels.cache
      .filter((c) => DESTINATION_CHANNEL_TYPES.includes(c.type))
      .map((c) => {
        const perms = botMember && 'permissionsFor' in c ? c.permissionsFor(botMember) : null;
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          canSend: canBotSendTo(c, botMember),
          canEmbed: perms?.has(PermissionFlagsBits.EmbedLinks) ?? false,
          canAttach: perms?.has(PermissionFlagsBits.AttachFiles) ?? false,
        };
      });

    res.json({ channels });
  });

  // 10. Rôles Discord du serveur avec hiérarchie
  router.get('/roles', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.json({ roles: [] });
      return;
    }

    const botHighest = guild.members.me?.roles.highest.position || 0;
    const roles = guild.roles.cache
      .filter((r) => r.name !== '@everyone')
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        manageable: r.position < botHighest,
      }))
      .sort((a, b) => b.position - a.position);

    res.json({ roles });
  });

  // 11. Prévisualisation en direct de la carte image générée (renvoie une image PNG)
  router.post('/preview-card', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { imageConfig, username, titleText, subtitleText, tagText } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    const guildName = guild?.name || 'Mon Serveur';
    const memberCount = guild?.memberCount ?? 0;
    // Aperçu au nom de l'admin connecté quand on le connaît (sinon « Rub »), avec le vrai nombre de membres.
    const viewer = req.user?.id ? await discordClient.users.fetch(req.user.id).catch(() => null) : null;
    const name = String(username || viewer?.globalName || viewer?.username || 'Rub').slice(0, 40);

    const dummyCtx: VariableContext = {
      userId: viewer?.id || '0',
      username: name,
      displayName: name,
      userTag: name,
      mentionUser: false,
      guildId,
      guildName,
      memberCount,
    };

    // Tous les réglages de la carte (modèle, couleurs, fond, police, forme…) ; ce qui manque prend la valeur par défaut.
    const conf = WelcomeImageConfigSchema.parse({
      ...(imageConfig && typeof imageConfig === 'object' ? imageConfig : {}),
      enabled: true,
      ...(titleText ? { titleText } : {}),
      ...(subtitleText ? { subtitleText } : {}),
      ...(tagText ? { tagText } : {}),
    });

    const avatarUrl =
      viewer?.displayAvatarURL({ size: 256, extension: 'png' }) ||
      discordClient.user?.displayAvatarURL({ size: 256, extension: 'png' }) ||
      'https://cdn.discordapp.com/embed/avatars/0.png';

    try {
      const buffer = await WelcomeCardGenerator.generateCard(conf, avatarUrl, dummyCtx);
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    } catch (err: any) {
      logger.error('Erreur preview card :', err);
      res.status(500).json({ error: 'Échec de la génération de l’image' });
    }
  });

  return router;
}
