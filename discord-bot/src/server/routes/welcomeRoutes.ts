import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { welcomeService } from '../../modules/welcome/services/welcomeService.js';
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
  router.patch('/', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = welcomeService.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  // 3. Envoyer un message de test réel sur Discord
  router.post('/test', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { type } = req.body; // 'welcome' | 'goodbye'

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }

    try {
      const result = await welcomeService.sendTest(guild, type === 'goodbye' ? 'goodbye' : 'welcome');
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur lors du test Welcome :', err);
      res.status(500).json({ error: err.message || 'Échec de l’envoi du test sur Discord' });
    }
  });

  // 4. Prévisualisation en direct de la carte image générée (renvoie une image PNG)
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
      accentColor: imageConfig?.accentColor || '#8B5CF6',
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
