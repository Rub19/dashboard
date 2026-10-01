/**
 * Présence : le texte affiché doit porter le verbe (« Listening to Spotify », pas juste « Spotify »),
 * sans le doubler s'il est déjà saisi, avec l'état en suffixe et la limite de 128 caractères de Discord.
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_presence_activity_text_v1.ts
 */
import assert from 'node:assert/strict';

process.on('unhandledRejection', () => undefined);
const { PresenceService } = await import('../src/modules/presence/services/presenceService.js');
const f = PresenceService.formatActivityText;

assert.equal(f('Listening', 'Spotify'), 'Listening to Spotify');
assert.equal(f('Playing', 'Valorant'), 'Playing Valorant');
assert.equal(f('Watching', '3 servers'), 'Watching 3 servers');
assert.equal(f('Competing', 'ETHONE Tournaments'), 'Competing in ETHONE Tournaments');
assert.equal(f('Listening', 'Listening to lo-fi'), 'Listening to lo-fi', 'pas de verbe en double');
assert.equal(f('Playing', 'Valorant', '/play'), 'Playing Valorant • /play');
assert.equal(f('Playing', 'x'.repeat(300)).length, 128);
console.log('  ✅ verbes, doublons, état et longueur');

const { ActivityRotationEngine } = await import('../src/modules/presence/services/activityRotationEngine.js');
const defaults = (ActivityRotationEngine as any).DEFAULT_ACTIVITIES ?? [];
assert.ok(defaults.length >= 10, 'rotation par défaut enrichie');
assert.ok(defaults.every((a: any) => a.text && a.type), 'chaque activité a un type et un texte');
console.log(`  ✅ ${defaults.length} activités par défaut`);
process.exit(0);
