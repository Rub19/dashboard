import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { formRepository } from '../storage/formRepository.js';
import { formService } from '../services/formService.js';
import { discordFormPanel } from '../ui/discordFormPanel.js';
import { DiscordFormSchema } from '../types/index.js';

export function createFormRouter(client: Client): Router {
  const router = Router({ mergeParams: true });
  discordFormPanel.initialize(client);

  // GET /api/guilds/:guildId/forms/overview
  router.get('/overview', (req: Request, res: Response) => {
    const { guildId } = req.params;
    const stats = formRepository.getOverviewStats(guildId);
    const forms = formRepository.getForms(guildId);
    const recentResponses = formRepository.getResponses(guildId).slice(0, 5);

    res.json({
      success: true,
      stats,
      forms,
      recentResponses,
    });
  });

  // GET /api/guilds/:guildId/forms
  router.get('/', (req: Request, res: Response) => {
    const { guildId } = req.params;
    const { status, search, category } = req.query;

    let forms = formRepository.getForms(guildId);
    if (status && status !== 'ALL') {
      forms = forms.filter((f) => f.status === status);
    }
    if (category && category !== 'ALL') {
      forms = forms.filter((f) => f.category === category);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      forms = forms.filter((f) => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    }

    res.json({ success: true, forms });
  });

  // POST /api/guilds/:guildId/forms
  router.post('/', (req: Request, res: Response) => {
    const { guildId } = req.params;
    const body = req.body || {};

    const newForm = {
      id: body.id || `form-${Date.now().toString(36)}`,
      guildId,
      title: body.title || 'Nouveau Formulaire',
      description: body.description || '',
      category: body.category || 'Général',
      status: 'DRAFT',
      version: 1,
      sections: body.sections || [
        { id: 'sec-1', title: 'Informations Générales', description: 'Renseignez vos réponses', order: 0 },
      ],
      fields: body.fields || [],
      conditions: body.conditions || [],
      scoring: body.scoring || {
        enabled: false,
        maxScore: 100,
        passScore: 60,
        thresholds: { low: 39, medium: 69, high: 100 },
      },
      antiSpam: body.antiSpam || {
        cooldownMinutes: 1440,
        maxSubmissionsPerUser: 1,
        minAccountAgeDays: 7,
        minGuildMembershipDays: 1,
        requiredRoleIds: [],
        forbiddenRoleIds: [],
        blacklistUserIds: [],
      },
      automations: body.automations || [],
      panelConfig: body.panelConfig || {
        channelId: '',
        embedTitle: `📝 ${body.title || 'Formulaire'}`,
        embedDescription: 'Cliquez sur le bouton ci-dessous pour postuler.',
        embedColor: '#6366f1',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'ETHONE Forms 2.0',
        buttonText: 'Postuler maintenant',
        buttonEmoji: '📝',
        buttonStyle: 'PRIMARY',
        submissionMode: 'HYBRID',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = formRepository.saveForm(newForm as any);
      res.json({ success: true, form: saved });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Erreur validation formulaire' });
    }
  });

  // GET /api/guilds/:guildId/forms/:formId
  router.get('/:formId', (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const form = formRepository.getFormById(guildId, formId);
    if (!form) {
      return res.status(404).json({ success: false, error: 'Formulaire introuvable' });
    }
    res.json({ success: true, form });
  });

  // PUT /api/guilds/:guildId/forms/:formId
  router.put('/:formId', (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const existing = formRepository.getFormById(guildId, formId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Formulaire introuvable' });
    }

    try {
      const updated = formRepository.saveForm({
        ...existing,
        ...req.body,
        id: formId,
        guildId,
        updatedAt: new Date().toISOString(),
      });
      res.json({ success: true, form: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Erreur mise à jour' });
    }
  });

  // POST /api/guilds/:guildId/forms/:formId/publish
  router.post('/:formId/publish', (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const published = formService.publishForm(guildId, formId);
    if (!published) {
      return res.status(404).json({ success: false, error: 'Formulaire introuvable' });
    }
    res.json({ success: true, form: published });
  });

  // DELETE /api/guilds/:guildId/forms/:formId
  router.delete('/:formId', (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const deleted = formRepository.deleteForm(guildId, formId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Formulaire introuvable' });
    }
    res.json({ success: true });
  });

  // POST /api/guilds/:guildId/forms/:formId/duplicate
  router.post('/:formId/duplicate', (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const dup = formRepository.duplicateForm(guildId, formId, req.body?.title);
    if (!dup) {
      return res.status(404).json({ success: false, error: 'Formulaire introuvable' });
    }
    res.json({ success: true, form: dup });
  });

  // GET /api/guilds/:guildId/forms/:formId/responses
  router.get('/:formId/responses', (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const { status, search, reviewerId } = req.query;

    let responses = formRepository.getResponses(guildId, formId);
    if (status && status !== 'ALL') {
      responses = responses.filter((r) => r.status === status);
    }
    if (reviewerId && reviewerId !== 'ALL') {
      responses = responses.filter((r) => r.assignedReviewerId === reviewerId);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      responses = responses.filter(
        (r) => r.userTag.toLowerCase().includes(q) || r.userId.includes(q) || r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, responses });
  });

  // GET /api/guilds/:guildId/forms/:formId/responses/:responseId
  router.get('/:formId/responses/:responseId', (req: Request, res: Response) => {
    const { guildId, responseId } = req.params;
    const response = formRepository.getResponseById(guildId, responseId);
    if (!response) {
      return res.status(404).json({ success: false, error: 'Réponse introuvable' });
    }
    res.json({ success: true, response });
  });

  // POST /api/guilds/:guildId/forms/:formId/responses/:responseId/review
  router.post('/:formId/responses/:responseId/review', async (req: Request, res: Response) => {
    const { guildId, responseId } = req.params;
    const { reviewerId, reviewerTag, status, decisionReason, noteContent } = req.body;

    const result = await formService.reviewResponse({
      guildId,
      responseId,
      reviewerId: reviewerId || 'staff-admin',
      reviewerTag: reviewerTag || 'Staff Member',
      status,
      decisionReason,
      noteContent,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, response: result.response });
  });

  // POST /api/guilds/:guildId/forms/:formId/responses/:responseId/notes
  router.post('/:formId/responses/:responseId/notes', (req: Request, res: Response) => {
    const { guildId, responseId } = req.params;
    const { authorId, authorTag, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Contenu de la note requis' });
    }

    const updated = formService.addNote({
      guildId,
      responseId,
      authorId: authorId || 'staff',
      authorTag: authorTag || 'Staff',
      content,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Réponse introuvable' });
    }
    res.json({ success: true, response: updated });
  });

  // PATCH /api/guilds/:guildId/forms/:formId/responses/:responseId/assign
  router.patch('/:formId/responses/:responseId/assign', (req: Request, res: Response) => {
    const { guildId, responseId } = req.params;
    const { reviewerId, reviewerTag } = req.body;

    const updated = formService.assignReviewer({
      guildId,
      responseId,
      reviewerId,
      reviewerTag,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Réponse introuvable' });
    }
    res.json({ success: true, response: updated });
  });

  // POST /api/guilds/:guildId/forms/:formId/submit
  router.post('/:formId/submit', async (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const { userId, userTag, userAvatar, answers, metadata } = req.body;

    const result = await formService.submitResponse({
      guildId,
      formId,
      userId: userId || `web-user-${Date.now().toString(36)}`,
      userTag: userTag || 'Utilisateur Web',
      userAvatar,
      answers: answers || [],
      metadata,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, response: result.response });
  });

  // POST /api/guilds/:guildId/forms/:formId/panel/publish
  router.post('/:formId/panel/publish', async (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const { channelId } = req.body;
    const form = formRepository.getFormById(guildId, formId);

    if (!form) {
      return res.status(404).json({ success: false, error: 'Formulaire introuvable' });
    }

    const targetChannelId = channelId || form.panelConfig.channelId;
    if (!targetChannelId) {
      return res.status(400).json({ success: false, error: 'Salon de destination manquant' });
    }

    try {
      const channel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        return res.status(400).json({ success: false, error: 'Salon Discord textuel introuvable ou inaccessible' });
      }

      const embed = discordFormPanel.buildPanelEmbed(form);
      const row = discordFormPanel.buildPanelActionRow(form);
      const sent = await (channel as any).send({ embeds: [embed], components: [row] });

      form.panelConfig.channelId = targetChannelId;
      form.panelConfig.messageId = sent.id;
      formRepository.saveForm(form);

      res.json({ success: true, messageId: sent.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erreur d\'envoi Discord' });
    }
  });

  // GET /api/guilds/:guildId/forms/:formId/export
  router.get('/:formId/export', (req: Request, res: Response) => {
    const { guildId, formId } = req.params;
    const format = req.query.format === 'csv' ? 'csv' : 'json';

    const data = formService.exportResponses(guildId, formId, format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="form-${formId}-responses.csv"`);
      return res.send(data);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="form-${formId}-responses.json"`);
    res.send(data);
  });

  return router;
}
