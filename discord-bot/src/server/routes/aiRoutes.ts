import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { aiService } from '../../modules/ai/services/aiService.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { logger } from '../../utils/logger.js';

export function createAiRouter(client: Client): Router {
  const router = Router({ mergeParams: true });

  // 1. Vue d'ensemble & KPIs
  router.get('/overview', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const overview = aiService.getOverview(guildId);
      res.json(overview);
    } catch (err: any) {
      logger.error('Erreur GET /ai/overview :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 2. Personnalité de l'IA
  router.get('/personality', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const settings = aiRepository.getSettings(guildId);
      res.json(settings.personality);
    } catch (err: any) {
      logger.error('Erreur GET /ai/personality :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.put('/personality', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const updated = aiService.updatePersonality(guildId, req.body);
      res.json(updated.personality);
    } catch (err: any) {
      logger.error('Erreur PUT /ai/personality :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 3. Salons & Overrides
  router.get('/channels', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const settings = aiRepository.getSettings(guildId);
      res.json({
        defaultMode: settings.defaultMode,
        channelRules: settings.channelRules,
        allowedChannels: settings.allowedChannelIds,
        blockedChannels: settings.blockedChannelIds,
      });
    } catch (err: any) {
      logger.error('Erreur GET /ai/channels :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.put('/channels', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { rule } = req.body;
      if (!rule || !rule.channelId) {
        return res.status(400).json({ error: 'Règle de salon invalide' });
      }
      const updated = aiService.updateChannelRule(guildId, rule);
      res.json(updated.channelRules);
    } catch (err: any) {
      logger.error('Erreur PUT /ai/channels :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 4. Base de connaissances (RAG)
  router.get('/knowledge', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const sources = aiRepository.getKnowledgeSources(guildId);
      res.json({ sources, total: sources.length });
    } catch (err: any) {
      logger.error('Erreur GET /ai/knowledge :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.post('/knowledge', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { title, type, content, scope, allowedChannelIds, allowedRoleIds } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Titre et contenu requis' });
      }

      const source = aiRepository.saveKnowledgeSource({
        id: `kn-${Date.now().toString(36)}`,
        guildId,
        title,
        type: type || 'TEXT',
        content,
        scope: scope || 'GLOBAL',
        allowedChannelIds,
        allowedRoleIds,
        tokenCount: Math.ceil(content.length / 4),
        status: 'READY',
        updatedAt: new Date().toISOString(),
      });

      res.status(201).json(source);
    } catch (err: any) {
      logger.error('Erreur POST /ai/knowledge :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.delete('/knowledge/:id', (req: Request, res: Response) => {
    try {
      const { guildId, id } = req.params;
      const success = aiRepository.deleteKnowledgeSource(guildId, id);
      if (!success) {
        return res.status(404).json({ error: 'Source introuvable' });
      }
      res.json({ success: true, message: 'Source supprimée' });
    } catch (err: any) {
      logger.error('Erreur DELETE /ai/knowledge/:id :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 5. Outils & Permissions
  router.get('/tools', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const settings = aiRepository.getSettings(guildId);
      res.json(settings.tools);
    } catch (err: any) {
      logger.error('Erreur GET /ai/tools :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.put('/tools', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const updated = aiService.updateTools(guildId, req.body);
      res.json(updated.tools);
    } catch (err: any) {
      logger.error('Erreur PUT /ai/tools :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 6. Mémoire & Confidentialité
  router.get('/memory', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const settings = aiRepository.getSettings(guildId);
      res.json(settings.memory);
    } catch (err: any) {
      logger.error('Erreur GET /ai/memory :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.delete('/memory/user/:userId', (req: Request, res: Response) => {
    try {
      const { guildId, userId } = req.params;
      const removed = aiRepository.forgetUserData(guildId, userId);
      res.json({ success: true, removedCount: removed });
    } catch (err: any) {
      logger.error('Erreur DELETE /ai/memory/user/:userId :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 7. Analytics & Feedback
  router.get('/analytics', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const analytics = aiRepository.getAnalytics(guildId);
      res.json(analytics);
    } catch (err: any) {
      logger.error('Erreur GET /ai/analytics :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 8. Playground de Test
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'La requête est requise' });
      }
      const testResult = await aiService.testPlayground(guildId, query);
      res.json(testResult);
    } catch (err: any) {
      logger.error('Erreur POST /ai/test :', err);
      res.status(500).json({ error: err.message || 'Erreur lors du test playground' });
    }
  });

  // 9. Publication de la version Draft
  router.post('/publish', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const published = aiService.publishDraft(guildId);
      res.json(published);
    } catch (err: any) {
      logger.error('Erreur POST /ai/publish :', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la publication' });
    }
  });

  return router;
}
