import { PresenceService } from './presenceService.js';
import { logger } from '../../../utils/logger.js';

export class SmartPresenceEngine {
  private static instance: SmartPresenceEngine;

  private constructor() {}

  public static getInstance(): SmartPresenceEngine {
    if (!SmartPresenceEngine.instance) {
      SmartPresenceEngine.instance = new SmartPresenceEngine();
    }
    return SmartPresenceEngine.instance;
  }

  /**
   * Applique la présence de maintenance officielle ETHONE
   */
  public setMaintenanceMode(enabled: boolean, reason = 'Maintenance en cours') {
    const presenceService = PresenceService.getInstance();

    if (enabled) {
      presenceService.updatePresence(
        'dnd',
        {
          type: 'Watching',
          name: `ETHONE: ${reason}`,
        },
        'System Maintenance',
        'maintenance_trigger',
        'maintenance',
        'Mode maintenance activé',
        true
      );
      logger.info('[SmartPresenceEngine] Présence basculée en mode Maintenance (DND).');
    } else {
      presenceService.updatePresence(
        'online',
        {
          type: 'Playing',
          name: 'Valorant',
        },
        'System Maintenance',
        'maintenance_trigger',
        'manual',
        'Fin du mode maintenance',
        true
      );
      logger.info('[SmartPresenceEngine] Présence rétablie en mode Opérationnel.');
    }
  }

  /**
   * Adapte la présence si un incident critique survient
   */
  public handleIncidentAlert(incidentTitle: string) {
    const presenceService = PresenceService.getInstance();
    presenceService.updatePresence(
      'dnd',
      {
        type: 'Watching',
        name: `Diagnostic: ${incidentTitle.substring(0, 30)}`,
      },
      'Incident Sentinel',
      'incident_system',
      'dynamic',
      `Alerte incident critique : ${incidentTitle}`,
      true
    );
  }
}
