import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { suggestionStorage } from '../../modules/suggestions/storage/suggestionStorage.js';
import { SuggestionService } from '../../modules/suggestions/services/suggestionService.js';
import { SuggestionCommentService } from '../../modules/suggestions/services/suggestionCommentService.js';
import { SuggestionPriority, SuggestionStatus } from '../../modules/suggestions/types/suggestion.js';

export function createSuggestionRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble (Stats & Répartition)
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const overview = suggestionStorage.getOverview(guildId);
    res.json(overview);
  });

  // 2. Liste des Suggestions
  router.get('/list', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const suggestions = suggestionStorage.getSuggestions(guildId);
    res.json({ suggestions });
  });

  // 3. Détail d'une Suggestion
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const suggestion = suggestionStorage.getById(id);
    if (!suggestion) {
      res.status(404).json({ error: 'Suggestion introuvable' });
      return;
    }
    res.json({ suggestion });
  });

  // 4. Créer une Suggestion (depuis le Dashboard)
  router.post('/create', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const { title, description, category, tags } = req.body;
      if (!title || !description) {
        res.status(400).json({ error: 'Titre et description requis' });
        return;
      }

      const user = (req as any).user;
      const suggestion = await SuggestionService.createSuggestion(discordClient, {
        guildId,
        authorId: user?.id || 'dashboard_admin',
        authorTag: user?.username || 'Dashboard Admin',
        authorAvatarUrl: user?.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null,
        title,
        description,
        category: category || 'Général',
        tags: tags || [],
      });

      res.json({ success: true, suggestion });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création de la suggestion' });
    }
  });

  // 5. Modifier le statut & Réponse officielle (Action Staff)
  router.post('/:id/status', async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const { status, staffResponse } = req.body;
    const user = (req as any).user;
    const staffTag = user?.username || 'Staff Dashboard';

    try {
      const updated = await SuggestionService.updateStatus(
        discordClient,
        id,
        status as SuggestionStatus,
        staffTag,
        staffResponse
      );

      if (!updated) {
        res.status(404).json({ error: 'Suggestion introuvable' });
        return;
      }

      res.json({ success: true, suggestion: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour du statut' });
    }
  });

  // 6. Ajouter un commentaire
  router.post('/:id/comment', async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const { content } = req.body;
    const user = (req as any).user;

    if (!content) {
      res.status(400).json({ error: 'Contenu du commentaire requis' });
      return;
    }

    try {
      const updated = SuggestionCommentService.addComment(id, {
        userId: user?.id || 'dashboard_staff',
        userTag: user?.username || 'Dashboard Staff',
        avatarUrl: user?.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null,
        content,
        isStaff: true,
      });

      if (!updated) {
        res.status(404).json({ error: 'Suggestion introuvable' });
        return;
      }

      await SuggestionService.updateDiscordMessage(discordClient, id);
      res.json({ success: true, suggestion: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l’ajout du commentaire' });
    }
  });

  // 7. Modifier la priorité
  router.post('/:id/priority', async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const { priority } = req.body;

    const updated = suggestionStorage.update(id, { priority: priority as SuggestionPriority });
    if (!updated) {
      res.status(404).json({ error: 'Suggestion introuvable' });
      return;
    }

    res.json({ success: true, suggestion: updated });
  });

  // 8. Marquer comme doublon
  router.post('/:id/duplicate', async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const { originalId } = req.body;
    const user = (req as any).user;

    const updated = await SuggestionService.updateStatus(
      discordClient,
      id,
      'duplicate',
      user?.username || 'Staff',
      `Marqué comme doublon de la suggestion #${originalId}.`
    );

    if (updated) {
      suggestionStorage.update(id, { duplicateOfId: String(originalId) });
    }

    res.json({ success: !!updated });
  });

  // 9. Supprimer une suggestion
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const ok = suggestionStorage.delete(id);
    res.json({ success: ok });
  });

  // 10. Configuration des suggestions
  router.get('/config/settings', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = suggestionStorage.getConfig(guildId);
    res.json(config);
  });

  router.put('/config/settings', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const updated = suggestionStorage.updateConfig(guildId, req.body);
    res.json({ success: true, config: updated });
  });

  return router;
}
