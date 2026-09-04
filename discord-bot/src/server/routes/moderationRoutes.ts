import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { ModerationService } from '../../modules/moderation/services/moderationService.js';
import {
  CaseActionSchema,
  CaseSourceSchema,
  CaseStatusSchema,
  StandardReasonSchema,
} from '../../modules/moderation/types/case.js';
import { logger } from '../../utils/logger.js';

export function createModerationRouter(discordClient: Client) {
  ModerationService.initialize(discordClient);
  const router = express.Router({ mergeParams: true });

  // 1. STATISTIQUES & VUE D'ENSEMBLE
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const stats = ModerationService.getOverviewStats(guildId);
      const recentCases = ModerationService.getCases(guildId, { limit: 10 });
      res.json({ success: true, stats, recentCases: recentCases.cases });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération statistiques modération' });
    }
  });

  // 2. LISTE DES CASES (FILTRABLE & PAGINÉE)
  router.get('/cases', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const action = req.query.action ? (String(req.query.action) as any) : undefined;
    const status = req.query.status ? (String(req.query.status) as any) : undefined;
    const source = req.query.source ? (String(req.query.source) as any) : undefined;
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const moderatorId = req.query.moderatorId ? String(req.query.moderatorId) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    try {
      const result = ModerationService.getCases(guildId, {
        action,
        status,
        source,
        userId,
        moderatorId,
        search,
        limit,
        offset,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération des cases' });
    }
  });

  // 3. DÉTAILS D'UNE CASE UNIQUE
  router.get('/cases/:caseNumber', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const caseNumber = Number(req.params.caseNumber);

    if (isNaN(caseNumber)) {
      res.status(400).json({ error: 'Numéro de case invalide' });
      return;
    }

    try {
      const modCase = ModerationService.getCaseByNumber(guildId, caseNumber);
      if (!modCase) {
        res.status(404).json({ error: `Case #${caseNumber} introuvable` });
        return;
      }

      const evidence = ModerationService.getEvidence(modCase.id);
      const notes = ModerationService.getCaseNotes(guildId, modCase.id);
      const userCases = ModerationService.getCases(guildId, { userId: modCase.userId, limit: 10 });

      res.json({
        success: true,
        case: modCase,
        evidence,
        notes,
        relatedCases: userCases.cases.filter((c) => c.caseNumber !== caseNumber),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération détail case' });
    }
  });

  // 4. APPLIQUER UNE NOUVELLE SANCTION (CRÉATION DE CASE)
  router.post('/cases', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { userId, userTag, action, reason, standardCategory, durationSeconds, metadata } = req.body;

    const actionValidation = CaseActionSchema.safeParse(action);
    if (!actionValidation.success) {
      res.status(400).json({ error: 'Action disciplinaire invalide' });
      return;
    }

    if (!userId) {
      res.status(400).json({ error: 'Identifiant utilisateur (userId) manquant' });
      return;
    }

    const moderatorId = req.user ? req.user.id : 'web-dashboard';
    const moderatorTag = req.user ? req.user.username : 'Web Dashboard';

    try {
      const result = await ModerationService.executeSanction({
        guildId,
        userId: String(userId),
        userTag,
        moderatorId,
        moderatorTag,
        action: actionValidation.data,
        reason: reason || 'Aucun motif spécifié',
        standardCategory: StandardReasonSchema.safeParse(standardCategory).success ? standardCategory : 'Other',
        durationSeconds: durationSeconds ? Number(durationSeconds) : null,
        source: 'MANUAL',
        metadata,
      });

      if (!result.success) {
        res.status(400).json({ error: result.error || 'Échec de la sanction' });
        return;
      }

      res.json({ success: true, case: result.case });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur exécution de la sanction' });
    }
  });

  // 5. RÉVOQUER / PARDONNER UNE SANCTION
  router.post('/cases/:caseNumber/revert', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const caseNumber = Number(req.params.caseNumber);
    const { reason = 'Pardon / Révocation manuelle' } = req.body;

    if (isNaN(caseNumber)) {
      res.status(400).json({ error: 'Numéro de case invalide' });
      return;
    }

    const moderatorId = req.user ? req.user.id : 'web-dashboard';
    const moderatorTag = req.user ? req.user.username : 'Web Dashboard';

    try {
      const result = ModerationService.revertCase(
        guildId,
        caseNumber,
        { id: moderatorId, tag: moderatorTag },
        reason
      );

      if (!result.success) {
        res.status(400).json({ error: result.error || 'Échec de la révocation' });
        return;
      }

      res.json({ success: true, case: result.case });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur révocation case' });
    }
  });

  // 6. FICHE PROFIL MODÉRATION D'UN MEMBRE
  router.get('/users/:userId/profile', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);

    try {
      const profile = await ModerationService.getUserProfile(guildId, userId);
      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération fiche profil' });
    }
  });

  // 7. ANALYTICS & TENDANCES DE MODÉRATION
  router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const days = req.query.days ? Number(req.query.days) : 7;

    try {
      const analytics = ModerationService.getPeriodTrends(guildId, days);
      res.json({ success: true, analytics });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération analytics' });
    }
  });

  // 8. PERFORMANCE DU STAFF (ADMINISTRATIF)
  router.get('/staff-performance', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const performance = ModerationService.getStaffPerformance(guildId);
      res.json({ success: true, performance });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur performance staff' });
    }
  });

  // 9. GESTION DES BANS DISCORD
  router.get('/bans', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }

    try {
      const bansCollection = await guild.bans.fetch({ limit: 100 });
      const bans = Array.from(bansCollection.values()).map((b) => ({
        userId: b.user.id,
        userTag: b.user.tag,
        username: b.user.username,
        avatarUrl: b.user.displayAvatarURL(),
        reason: b.reason || 'Aucun motif renseigné',
      }));
      res.json({ success: true, bans });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération des bans' });
    }
  });

  router.post('/unban', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { userId, reason } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId manquant' });
      return;
    }

    const moderatorId = req.user ? req.user.id : 'web-dashboard';
    const moderatorTag = req.user ? req.user.username : 'Web Dashboard';

    try {
      const result = await ModerationService.executeSanction({
        guildId,
        userId: String(userId),
        moderatorId,
        moderatorTag,
        action: 'UNBAN',
        reason: reason || 'Débannissement manuel via Dashboard',
        source: 'MANUAL',
      });

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, case: result.case });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur débannissement' });
    }
  });

  // 10. PREUVES (EVIDENCE)
  router.post('/cases/:caseNumber/evidence', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const caseNumber = Number(req.params.caseNumber);
    const { type, url, content, messageId, channelId } = req.body;

    const modCase = ModerationService.getCaseByNumber(guildId, caseNumber);
    if (!modCase) {
      res.status(404).json({ error: 'Case introuvable' });
      return;
    }

    const addedBy = req.user ? `${req.user.username} (${req.user.id})` : 'Web Dashboard';

    try {
      const evidence = ModerationService.addEvidence({
        caseId: modCase.id,
        type: type || 'NOTE',
        url,
        content,
        messageId,
        channelId,
        addedBy,
      });
      res.json({ success: true, evidence });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur ajout preuve' });
    }
  });

  router.delete('/cases/:caseNumber/evidence/:evidenceId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const caseNumber = Number(req.params.caseNumber);
    const evidenceId = String(req.params.evidenceId);

    const modCase = ModerationService.getCaseByNumber(guildId, caseNumber);
    if (!modCase) {
      res.status(404).json({ error: 'Case introuvable' });
      return;
    }

    try {
      const ok = ModerationService.deleteEvidence(modCase.id, evidenceId);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur suppression preuve' });
    }
  });

  // 11. NOTES STAFF
  router.post('/cases/:caseNumber/notes', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const caseNumber = Number(req.params.caseNumber);
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Contenu de note requis' });
      return;
    }

    const modCase = ModerationService.getCaseByNumber(guildId, caseNumber);
    if (!modCase) {
      res.status(404).json({ error: 'Case introuvable' });
      return;
    }

    const authorId = req.user ? req.user.id : 'web-dashboard';
    const authorTag = req.user ? req.user.username : 'Web Dashboard';

    try {
      const note = ModerationService.addNote({
        guildId,
        userId: modCase.userId,
        caseId: modCase.id,
        authorId,
        authorTag,
        content,
      });
      res.json({ success: true, note });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur ajout note' });
    }
  });

  // 12. CONFIGURATION DE MODÉRATION & RÉTENTION
  router.get('/settings', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const settings = ModerationService.getSettings(guildId);
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération configuration' });
    }
  });

  router.put('/settings', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = ModerationService.updateSettings(guildId, req.body);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur mise à jour configuration' });
    }
  });

  // 13. AUDIT LOGS
  router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    try {
      const logs = ModerationService.getAuditLogs(guildId, limit);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur audit logs' });
    }
  });

  return router;
}
