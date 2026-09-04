import express, { Request, Response } from 'express';
import { ChannelType, Client, PermissionFlagsBits } from 'discord.js';
import { welcomeService } from '../../modules/welcome/services/welcomeService.js';
import { welcomeRepository } from '../../modules/welcome/storage/welcomeRepository.js';
import { PREBUILT_TEMPLATES } from '../../modules/welcome/types/templates.js';
import { WelcomeCardGenerator } from '../../modules/welcome/images/welcomeCardGenerator.js';
import { VariableContext } from '../../modules/welcome/types/variables.js';
import { logger } from '../../utils/logger.js';

export function createWelcomeRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Récupérer la configuration Welcome & Goodbye
  router.get('/', async (req: Request, res: Response): Promise<void> => {
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
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  };

  router.patch('/', handleUpdateConfig);
  router.put('/', handleUpdateConfig);

  // 3. Vue d'ensemble, métriques & Funnel
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const overview = welcomeRepository.getOverview(guildId);
      res.json(overview);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur overview' });
    }
  });

  // 4. Envoyer un message de test réel sur Discord (en salon ou en MP)
  router.post('/test', async (req: Request, res: Response): Promise<void> => {
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
      res.status(500).json({ error: err.message || 'Échec de l’envoi du test sur Discord' });
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
      welcomeRepository.saveOnboardingFlow(guildId, { ...req.body, guildId });
      res.json({ success: true, flow: req.body });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données onboarding invalides' });
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
      res.json({ success: true, verification: req.body });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de vérification invalides' });
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
      res.status(500).json({ error: err.message });
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
      .filter((c) => c.type === ChannelType.GuildText)
      .map((c) => {
        const perms = botMember ? c.permissionsFor(botMember) : null;
        return {
          id: c.id,
          name: c.name,
          canSend: perms?.has(PermissionFlagsBits.SendMessages) ?? false,
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
    const memberCount = guild?.memberCount || 1245;

    const dummyCtx: VariableContext = {
      userId: '1128633164290596884',
      username: username || 'Rub',
      displayName: username || 'Rub',
      userTag: `${username || 'Rub'}#0001`,
      mentionUser: false,
      guildId,
      guildName,
      memberCount,
    };

    const conf = {
      enabled: true,
      template: imageConfig?.template || 'default',
      titleText: titleText || imageConfig?.titleText || 'BIENVENUE',
      subtitleText: subtitleText || imageConfig?.subtitleText || '{username}',
      tagText: tagText || imageConfig?.tagText || 'Membre #{membercount}',
      accentColor: imageConfig?.accentColor || '#10B981',
      customBackgroundUrl: imageConfig?.customBackgroundUrl || null,
    };

    const avatarUrl =
      discordClient.user?.displayAvatarURL({ size: 256 }) ||
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
