/**
 * 🛡️ ETHONE DISCORD — RESILIENCE 2.0
 * Resilience & Disaster Recovery API Routes
 */

import { Router, Request, Response } from 'express';
import { healthStatusService } from '../../services/resilience/healthStatusService.js';
import { circuitBreakerRegistry } from '../../services/resilience/circuitBreakerService.js';
import { reconciliationEngine } from '../../services/resilience/reconciliationEngine.js';
import { startupRecoveryService } from '../../services/resilience/startupRecoveryService.js';
import { rateLimiterService } from '../../services/resilience/rateLimiterService.js';
import { guildOperationLockService } from '../../services/resilience/guildOperationLockService.js';
import { idempotencyService } from '../../services/resilience/idempotencyService.js';

export function createResilienceRouter(): Router {
  const router = Router();

  // 1. GET /api/resilience/health - Snapshot complet de la santé système
  router.get('/health', (req: Request, res: Response) => {
    const snapshot = healthStatusService.getSnapshot();
    res.json({ success: true, data: snapshot });
  });

  // 2. GET /api/resilience/incidents - Historique d'audit des pannes et récupérations
  router.get('/incidents', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = healthStatusService.getIncidentHistory(limit);
    res.json({ success: true, data: history });
  });

  // 3. GET /api/resilience/circuits - Télémétrie des Circuit Breakers
  router.get('/circuits', (req: Request, res: Response) => {
    const metrics = circuitBreakerRegistry.getAllMetrics();
    res.json({ success: true, data: metrics });
  });

  // 4. POST /api/resilience/reconcile - Lancement d'une passe de réconciliation
  router.post('/reconcile', async (req: Request, res: Response): Promise<void> => {
    try {
      const { guildId } = req.body;
      if (!guildId) {
        res.status(400).json({ success: false, error: 'guildId requis pour la réconciliation.' });
        return;
      }

      const report = await reconciliationEngine.reconcileGuild(guildId);
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. GET /api/resilience/startup-steps - Rapport du pipeline de démarrage en 12 étapes
  router.get('/startup-steps', (req: Request, res: Response) => {
    const steps = startupRecoveryService.getStepResults();
    res.json({
      success: true,
      data: {
        isRecovered: startupRecoveryService.isSystemRecovered(),
        steps,
      },
    });
  });

  // 6. POST /api/resilience/chaos/reset - Rétablissement des circuits
  router.post('/chaos/reset', (req: Request, res: Response) => {
    circuitBreakerRegistry.resetAll();
    healthStatusService.setSystemState('HEALTHY', 'All circuits reset to nominal');
    res.json({ success: true, message: 'Circuits rétablis et santé déclarée HEALTHY.' });
  });

  // 7. GET /api/resilience/rate-limits - Métriques du rate limiter
  router.get('/rate-limits', (req: Request, res: Response) => {
    res.json({ success: true, data: rateLimiterService.getStats() });
  });

  // 8. GET /api/resilience/abuse-logs - Journal d'audit des dépassements et abus
  router.get('/abuse-logs', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const guildId = req.query.guildId as string | undefined;
    res.json({ success: true, data: rateLimiterService.getAbuseLogs(guildId, limit) });
  });

  // 9. GET /api/resilience/locks - Verrous d'opérations lourdes actifs
  router.get('/locks', (req: Request, res: Response) => {
    res.json({ success: true, data: guildOperationLockService.getAllActiveLocks() });
  });

  // 10. GET /api/resilience/idempotency - Statistiques du cache d'idempotence
  router.get('/idempotency', (req: Request, res: Response) => {
    res.json({ success: true, data: idempotencyService.getStats() });
  });

  return router;
}
