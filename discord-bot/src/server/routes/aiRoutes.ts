import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { aiService } from '../../modules/ai/services/aiService.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { logger } from '../../utils/logger.js';
import { requireStringParam } from '../utils/params.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

export function createAiRouter(client: Client): Router {
  const router = Router({ mergeParams: true });

  // 1. Vue d'ensemble & KPIs
  router.get('/overview', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
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
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const settings = aiRepository.getSettings(guildId);
      res.json(settings.personality);
    } catch (err: any) {
      logger.error('Erreur GET /ai/personality :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.put('/personality', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const updated = aiService.updatePersonality(guildId, req.body);
      emitConfigUpdated('ai', guildId, updated, 'DASHBOARD', req.user?.id);
      res.json(updated.personality);
    } catch (err: any) {
      logger.error('Erreur PUT /ai/personality :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 2b. Réglages de comportement (mode global, anti-hallucination, sources,
  // mémoire, budget, salon IA dédié, génération d'images, humeur du Thon,
  // mots bannis) — whitelist explicite pour ne jamais laisser le dashboard
  // toucher provider/model/clés via cette route.
  const BEHAVIOR_FIELDS = (settings: ReturnType<typeof aiRepository.getSettings>) => ({
    enabled: settings.enabled,
    defaultMode: settings.defaultMode,
    hallucinationMode: settings.hallucinationMode,
    showSources: settings.showSources,
    memory: settings.memory,
    dailyBudgetTokens: settings.dailyBudgetTokens,
    dedicatedChannelId: settings.dedicatedChannelId ?? null,
    allowImageGeneration: settings.allowImageGeneration ?? false,
    bannedWords: settings.bannedWords ?? [],
    thonMood: settings.thonMood ?? 'SAGE',
  });

  router.get('/settings', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      res.json(BEHAVIOR_FIELDS(aiRepository.getSettings(guildId)));
    } catch (err: any) {
      logger.error('Erreur GET /ai/settings :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.put('/settings', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const body = req.body || {};
      const patch: Record<string, unknown> = {};
      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
      if (typeof body.defaultMode === 'string') patch.defaultMode = body.defaultMode;
      if (typeof body.hallucinationMode === 'string') patch.hallucinationMode = body.hallucinationMode;
      if (typeof body.showSources === 'string') patch.showSources = body.showSources;
      if (typeof body.dailyBudgetTokens === 'number' && body.dailyBudgetTokens >= 0) patch.dailyBudgetTokens = body.dailyBudgetTokens;
      if (body.memory && typeof body.memory === 'object') {
        const current = aiRepository.getSettings(guildId).memory;
        patch.memory = { ...current, ...body.memory };
      }
      if (typeof body.dedicatedChannelId === 'string' || body.dedicatedChannelId === null) {
        patch.dedicatedChannelId = body.dedicatedChannelId;
      }
      if (typeof body.allowImageGeneration === 'boolean') patch.allowImageGeneration = body.allowImageGeneration;
      if (Array.isArray(body.bannedWords) && body.bannedWords.every((w: unknown) => typeof w === 'string')) {
        patch.bannedWords = body.bannedWords.slice(0, 200);
      }
      if (['SAGE', 'GAMER_SARCASTIQUE', 'PROTECTEUR', 'CYBERPUNK', 'CUSTOM'].includes(body.thonMood)) {
        patch.thonMood = body.thonMood;
      }
      const updated = aiRepository.saveSettings(guildId, patch as any);
      emitConfigUpdated('ai', guildId, updated, 'DASHBOARD', req.user?.id);
      res.json(BEHAVIOR_FIELDS(updated));
    } catch (err: any) {
      logger.error('Erreur PUT /ai/settings :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 3. Salons & Overrides
  router.get('/channels', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const settings = aiRepository.getSettings(guildId);
      const guild = client.guilds.cache.get(guildId);
      const textChannels = guild
        ? guild.channels.cache
            .filter((c) => c.isTextBased() && !c.isThread())
            .map((c) => ({ id: c.id, name: c.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];
      res.json({
        textChannels,
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
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const { rule } = req.body;
      if (!rule || !rule.channelId) {
        return res.status(400).json({ error: 'Règle de salon invalide' });
      }
      const updated = aiService.updateChannelRule(guildId, rule);
      emitConfigUpdated('ai', guildId, updated, 'DASHBOARD', req.user?.id);
      res.json(updated.channelRules);
    } catch (err: any) {
      logger.error('Erreur PUT /ai/channels :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 4. Base de connaissances (RAG)
  router.get('/knowledge', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const sources = aiRepository.getKnowledgeSources(guildId);
      res.json({ sources, total: sources.length });
    } catch (err: any) {
      logger.error('Erreur GET /ai/knowledge :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.post('/knowledge', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
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
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const id = requireStringParam(req.params.id, 'id');
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
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const settings = aiRepository.getSettings(guildId);
      res.json(settings.tools);
    } catch (err: any) {
      logger.error('Erreur GET /ai/tools :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.put('/tools', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const updated = aiService.updateTools(guildId, req.body);
      emitConfigUpdated('ai', guildId, updated, 'DASHBOARD', req.user?.id);
      res.json(updated.tools);
    } catch (err: any) {
      logger.error('Erreur PUT /ai/tools :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 6. Mémoire & Confidentialité
  router.get('/memory', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const settings = aiRepository.getSettings(guildId);
      res.json(settings.memory);
    } catch (err: any) {
      logger.error('Erreur GET /ai/memory :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.delete('/memory/user/:userId', (req: Request, res: Response) => {
    try {
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const userId = requireStringParam(req.params.userId, 'userId');
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
      const guildId = requireStringParam(req.params.guildId, 'guildId');
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
      const guildId = requireStringParam(req.params.guildId, 'guildId');
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
      const guildId = requireStringParam(req.params.guildId, 'guildId');
      const published = aiService.publishDraft(guildId);
      res.json(published);
    } catch (err: any) {
      logger.error('Erreur POST /ai/publish :', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la publication' });
    }
  });

  return router;
}
