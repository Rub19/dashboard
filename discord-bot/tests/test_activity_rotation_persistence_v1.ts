/**
 * Rotation d'activité : la configuration (enabled notamment) doit survivre à un redémarrage du bot — avant,
 * ActivityRotationEngine gardait tout en mémoire seule et repartait à `enabled: false` à chaque `pm2 restart`,
 * sans que rien ne le signale. Vérifie aussi qu'un seul système de rotation tourne (l'ancien, dupliqué et
 * codé en dur dans PresenceService, a été supprimé).
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_activity_rotation_persistence_v1.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotation-'));
process.chdir(dataDir);
process.on('unhandledRejection', () => undefined);

const { activityRotationEngine } = await import('../src/modules/presence/services/activityRotationEngine.js').then((m) => ({
  activityRotationEngine: (m as any).ActivityRotationEngine.getInstance(),
}));
const { PresenceService } = await import('../src/modules/presence/services/presenceService.js');

// 1. L'ancien système dupliqué (rotationPresets/startAutoRotation) a bien été retiré de PresenceService.
assert.equal((PresenceService.getInstance() as any).startAutoRotation, undefined, "l'ancien moteur de rotation codé en dur est supprimé");
console.log('  ✅ un seul moteur de rotation (ActivityRotationEngine), l’ancien doublon a été retiré');

// 2. Activer la rotation écrit bien enabled: true sur disque (persistance).
activityRotationEngine.startRotation();
const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'data', 'activity_rotation.json'), 'utf-8'));
assert.equal(saved.enabled, true, 'enabled: true est bien persisté sur disque');
console.log('  ✅ activer la rotation persiste enabled: true (survit à un redémarrage du bot)');

activityRotationEngine.stopRotation();
const savedOff = JSON.parse(fs.readFileSync(path.join(dataDir, 'data', 'activity_rotation.json'), 'utf-8'));
assert.equal(savedOff.enabled, false, 'désactiver la rotation persiste bien enabled: false');
console.log('  ✅ désactiver la rotation met aussi à jour le fichier');

// 3. executeNextRotation() applique une vraie activité (pas figée) à la présence courante.
activityRotationEngine.updateConfig({
  enabled: true,
  activities: [{ id: 'a1', type: 'Watching', text: 'Test rotation' }],
  order: 'sequential',
});
activityRotationEngine.stopRotation(); // stoppe le timer réel, on appelle executeNextRotation() nous-mêmes
activityRotationEngine.executeNextRotation();
const state = PresenceService.getInstance().getCurrentState();
assert.equal(state.activity.name, 'Test rotation', 'la présence reflète bien la dernière activité de rotation');
assert.equal(state.source, 'rotation', "source: 'rotation', pas 'manual' (ne bloque pas les prochains ticks)");
console.log('  ✅ executeNextRotation() met vraiment à jour la présence avec une activité fraîche');

console.log('\nTout est bon');
