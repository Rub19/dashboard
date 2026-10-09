import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Données dans un dossier jetable : le moteur écrit data/protections.json.
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'etho-prot-')));

const d = await import('../src/modules/protections/detectors.js');

// --- Détecteurs ---
assert.equal(d.findBlockedLink('va sur https://exemple.fr/page', ['general'], []), 'https://exemple.fr/page');
assert.equal(d.findBlockedLink('https://m.youtube.com/watch?v=1', ['general'], ['youtube.com']), null);
assert.ok(d.findBlockedLink('rejoins discord.gg/abc', ['discord'], []));
assert.equal(d.findBlockedLink('https://site.fr/page', ['images'], []), null);
assert.ok(d.findBlockedLink('https://site.fr/chat.png', ['images'], []));
assert.equal(d.findBannedWord('Tu es un ÉNORME Crétin !', ['enorme']), 'enorme');
assert.equal(d.findBannedWord('encrétiné', ['cretin']), null);
assert.equal(d.countEmojis('😀😀 🇫🇷 👨‍👩‍👧 <:pepe:123456789012345678>'), 5);
assert.equal(d.countEmojis('<:pepe:123456789012345678>', false, true), 0);
assert.ok(d.isTextWall('a\n'.repeat(30), 1500, 20, false));
assert.ok(!d.isTextWall('```\n' + 'x\n'.repeat(30) + '```', 1500, 20, true));
assert.ok(d.similarity(d.normalizeForDuplicate('Gagne 100 robux ici', 'similar'), d.normalizeForDuplicate('gagne 250 robux ici !', 'similar')) >= 0.85);
assert.ok(d.detectScam('Free Nitro for everyone https://dlscord.gift/abc'));
assert.equal(d.detectScam('Le lien officiel est https://discord.com/invite/abc'), null);
assert.ok(d.toxicityScore('tu es un connard', true) >= 90);
assert.equal(d.toxicityScore('putain il pleut', true), 0);

// --- Moteur : seuil, réparation de la rafale, punition unique, whitelist ---
const { protectionStore } = await import('../src/modules/protections/protectionStore.js');
const { protectionEngine } = await import('../src/modules/protections/protectionEngine.js');

const G = '100000000000000001';
let timeouts = 0;
const members: Record<string, any> = {
  '200000000000000001': { id: '200000000000000001', user: { tag: 'raider', bot: false }, roles: { cache: { has: () => false } }, moderatable: true, timeout: async () => void timeouts++ },
  '200000000000000002': { id: '200000000000000002', user: { tag: 'staff', bot: false }, roles: { cache: { has: (r: string) => r === '300000000000000001' } }, moderatable: true, timeout: async () => void timeouts++ },
};
const guild: any = {
  id: G,
  ownerId: '999999999999999999',
  client: { user: { id: '888888888888888888' }, users: { fetch: async () => null } },
  members: { fetch: async (id: string) => members[id] ?? null, me: null },
  channels: { cache: new Map() },
  roles: { cache: new Map() },
};

protectionStore.update(G, 'antiBan', { enabled: true, quotaMax: 3, quotaSeconds: 60, punish: 'timeout', wlRoles: ['300000000000000001'] });
let undone = 0;
const ban = (who: string) => protectionEngine.evaluate(guild, 'antiBan', who, { detail: 'test', undo: async () => void undone++ });

assert.equal(await ban('200000000000000001'), false);
assert.equal(await ban('200000000000000001'), false);
assert.equal(undone, 0, 'rien n’est réparé sous le seuil');
assert.equal(await ban('200000000000000001'), true);
assert.equal(undone, 3, 'toute la rafale est réparée');
assert.equal(timeouts, 1, 'une seule punition');

// Rôle whitelisté pour cette protection : immunité totale.
for (let i = 0; i < 5; i++) assert.equal(await ban('200000000000000002'), false);
// Seuil dédié pour la whitelist : sanctionné au-delà de 5.
protectionStore.update(G, 'antiBan', { exceptionQuotaMax: 6, exceptionQuotaSeconds: 60 });
for (let i = 0; i < 5; i++) assert.equal(await ban('200000000000000002'), false);
assert.equal(await ban('200000000000000002'), true);
// Le propriétaire du serveur n'est jamais compté.
assert.equal(await protectionEngine.evaluate(guild, 'antiBan', '999999999999999999', { detail: 'owner' }), false);
// Désactivée : rien.
protectionStore.update(G, 'antiBan', { enabled: false });
assert.equal(await ban('200000000000000001'), false);

console.log('ok test_protections_v1');
process.exit(0);
