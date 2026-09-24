import { listModuleStates, setModuleEnabled } from '../services/moduleRegistry.js';

/**
 * Interrupteur général de chaque module, tel qu'enregistré par le bot (registre central : services/moduleRegistry.ts).
 * Les identifiants sont ceux du hub du dashboard (app/discord/page.tsx).
 */
export function getModuleStatus(guildId: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const m of listModuleStates(guildId)) out[m.id] = m.enabled;
  return out;
}

export { setModuleEnabled };
