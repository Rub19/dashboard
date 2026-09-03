import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { autoModRepository } from '../../modules/automod/storage/autoModRepository.js';
import { AutoModConfigSchema, CustomRuleSchema } from '../../modules/automod/types/autoMod.js';
import { RuleTesterService } from '../../modules/automod/services/ruleTesterService.js';
import { StrikeService } from '../../modules/automod/services/strikeService.js';
import { AutoModIncidentService } from '../../modules/automod/services/autoModIncidentService.js';
import { AutoModRiskEngine } from '../../modules/automod/services/autoModRiskEngine.js';

export function createAutoModRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. VUE D'ENSEMBLE (OVERVIEW) & STATS
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const config = autoModRepository.getConfig(guildId);
      const rules = autoModRepository.getRules(guildId);
      const incidents = autoModRepository.getIncidents(guildId, 100);

      // Calculer les métriques
      let actionsCount = 0;
      let strikesCount = 0;
      for (const inc of incidents) {
        actionsCount += inc.actionsTaken.length;
        strikesCount += inc.strikesAdded || 0;
      }

      // Risk score moyen récent
      const recentRisk = incidents.slice(0, 10).reduce((sum, i) => sum + i.totalRiskScore, 0);
      const avgRisk = incidents.length > 0 ? Math.round(recentRisk / Math.min(10, incidents.length)) : 10;
      const riskLevel = AutoModRiskEngine.getRiskLevel(avgRisk);

      res.json({
        success: true,
        guildId,
        enabled: config.enabled,
        smartMode: config.smartMode,
        riskLevel,
        avgRiskScore: avgRisk,
        rulesCount: rules.length,
        detectionsCount: incidents.length,
        actionsCount,
        strikesCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération overview AutoMod' });
    }
  });

  // 2. CONFIGURATION GLOBALE & DÉTECTEURS
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const config = autoModRepository.getConfig(guildId);
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération config AutoMod' });
    }
  });

  router.put('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const parsed = AutoModConfigSchema.partial().parse(req.body);
      const updated = autoModRepository.updateConfig(guildId, parsed);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Configuration AutoMod invalide' });
    }
  });

  // 3. RÈGLES PERSONNALISÉES (CUSTOM RULES CRUD)
  router.get('/rules', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const rules = autoModRepository.getRules(guildId);
      res.json({ success: true, rules });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération des règles' });
    }
  });

  router.post('/rules', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const id = req.body.id || `RULE-${Date.now().toString().slice(-5)}`;
      const rule = CustomRuleSchema.parse({ ...req.body, id });
      const created = autoModRepository.addRule(guildId, rule);
      res.json({ success: true, rule: created });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de règle invalides' });
    }
  });

  router.put('/rules/:ruleId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const ruleId = String(req.params.ruleId);
    try {
      const updated = autoModRepository.updateRule(guildId, ruleId, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Règle introuvable' });
        return;
      }
      res.json({ success: true, rule: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Mise à jour de la règle invalide' });
    }
  });

  router.delete('/rules/:ruleId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const ruleId = String(req.params.ruleId);
    try {
      const deleted = autoModRepository.deleteRule(guildId, ruleId);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur suppression de la règle' });
    }
  });

  // 4. TEST DE RÈGLE / SANDBOX SANS SANCTIONS
  router.post('/test-rule', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { messageContent, userId, channelId } = req.body;

    if (!messageContent || typeof messageContent !== 'string') {
      res.status(400).json({ error: 'Contenu de message requis pour le test' });
      return;
    }

    try {
      const result = RuleTesterService.testMessage({
        guildId,
        messageContent,
        userId,
        channelId,
      });
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur exécution du test' });
    }
  });

  // 5. STRIKES & SANCTIONS PROGRESSIVES
  router.get('/strikes/:userId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);
    try {
      const strikes = StrikeService.getActiveStrikes(guildId, userId);
      res.json({ success: true, strikes });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération des strikes' });
    }
  });

  router.post('/strikes/clear', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId manquant' });
      return;
    }
    try {
      const cleared = StrikeService.clearStrikes(guildId, userId);
      res.json({ success: true, clearedCount: cleared });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur réinitialisation des strikes' });
    }
  });

  // 6. PROFIL DE MODÉRATION UTILISATEUR
  router.get('/users/:userId/profile', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);

    const guild = discordClient.guilds.cache.get(guildId);
    let member = guild?.members.cache.get(userId);
    if (!member && guild) {
      try {
        member = await guild.members.fetch(userId);
      } catch {}
    }

    const user = member?.user || discordClient.users.cache.get(userId);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    try {
      const profile = AutoModIncidentService.getUserProfile(guildId, member || user);
      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur profil de modération' });
    }
  });

  // 7. HISTORIQUE DES DÉTECTIONS
  router.get('/history', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    try {
      const incidents = AutoModIncidentService.getIncidents(guildId, limit);
      res.json({ success: true, incidents });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur historique des détections' });
    }
  });

  return router;
}
