/** Suivi IA du centre de contrôle : jetons réels, répartition prompt/réponse, plafond configuré, échecs comptés. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-aimon-')));
const { BotAiMonitorService } = await import('../src/modules/botControl/services/botAiMonitorService.js');
const { BotConfigService } = await import('../src/modules/botControl/services/botConfigService.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const mon = BotAiMonitorService.getInstance();
const empty = mon.getAiStats();
ok(empty.requests24h === 0 && empty.totalTokens24h === 0 && empty.estimatedCostTodayUsd === 0 && empty.avgInferenceLatencyMs === 0, 'sans requête : tout à zéro, aucun chiffre inventé');

mon.recordAiUsage(1000, 400, true, 'test-model', 'OpenRouter', { prompt: 900, completion: 100 });
mon.recordAiUsage(200, 600, true, 'test-model', 'OpenRouter'); // pas de détail : répartition 50/50 supposée
mon.recordAiUsage(0, 200, false, undefined, 'OpenRouter');
const s = mon.getAiStats();
ok(s.requests24h === 3 && s.totalTokens24h === 1200, '3 requêtes, 1200 jetons');
ok(s.promptTokens24h === 900 + 100 && s.completionTokens24h === 100 + 100, 'répartition : valeurs réelles quand elles existent, 50/50 sinon');
ok(s.successRate === 66.7, 'taux de succès réel (2 sur 3)');
ok(s.avgInferenceLatencyMs === 400, 'latence moyenne réelle');
ok(s.activeModel === 'test-model' && s.provider === 'OpenRouter', 'modèle et fournisseur réellement utilisés');
ok(s.dailyBudgetUsd === 5, 'plafond par défaut : 5 $');
BotConfigService.getInstance().updateSettings({ aiDailySpendLimitUsd: 0.01 });
const s2 = mon.getAiStats();
ok(s2.dailyBudgetUsd === 0.01 && s2.budgetUsedPercent > 0, 'plafond lu depuis le réglage global du bot');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
