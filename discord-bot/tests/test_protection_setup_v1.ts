import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

// Les stockages lisent et écrivent ./data : on travaille dans un dossier temporaire.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-setup-'));
process.chdir(tmpDir);

const { planProtectionSetup, applyProtectionSetup } = await import('../src/modules/server/services/protectionSetupService.js');
const { protectionStore } = await import('../src/modules/protections/protectionStore.js');
const { auditRepository } = await import('../src/modules/logs/storage/auditRepository.js');
const { setModuleEnabled, isModuleEnabled } = await import('../src/services/moduleRegistry.js');

const guild = { id: '900000000000000001' } as any;
protectionStore.startFresh(guild.id);
for (const m of ['security', 'anti-nuke', 'automod', 'logs']) setModuleEnabled(guild.id, m, false, 'DASHBOARD', undefined, false);

// Types de serveur : même découpage que Keeper.
const plan = (serverType: 'friends' | 'community' | 'large', severity: 'watch' | 'balanced' | 'strict' = 'balanced', overwrite = false) =>
  planProtectionSetup(guild, { serverType, severity, alertChannelId: null, overwrite });
const friends = await plan('friends');
const community = await plan('community');
const large = await plan('large');
assert.equal(friends.length, 18, 'entre amis : base');
assert.equal(community.length, 26, 'communauté : base + messages et arrivées');
assert.equal(large.length, 32, 'grosse communauté : + vocal, fils, expressions');
assert.ok(!large.some((i) => i.status === 'unavailable'), 'tout est disponible');
assert.ok(community.every((i) => i.status === 'enable'), 'tout est à activer sur un serveur vierge');

// Équilibré : retrait des rôles pour le staff, expulsion pour les arrivées, timeout 10 min pour les messages.
assert.equal(community.find((i) => i.id === 'antiBan')!.sanction, 'Retire les rôles');
assert.equal(community.find((i) => i.id === 'antiAlt')!.sanction, 'Expulse');
assert.equal(community.find((i) => i.id === 'antiLink')!.sanction, 'Timeout 10 min');

// Application en strict avec un salon d'alertes.
const after = await applyProtectionSetup(guild, { serverType: 'community', severity: 'strict', alertChannelId: '900000000000000099', overwrite: false });
assert.ok(after.every((i) => i.status === 'already'), 'après application, tout est en place');
assert.equal(protectionStore.get(guild.id, 'antiBan').punish, 'ban', 'strict : bannit');
assert.equal(protectionStore.get(guild.id, 'antiSpam').timeoutSeconds, 3600, 'strict : timeout 1 h');
assert.equal(protectionStore.get(guild.id, 'antiAlt').punish, 'kick');
assert.equal(protectionStore.get(guild.id, 'antiBan').logChannelId, '900000000000000099', 'salon de log posé sur chaque protection');
assert.equal(auditRepository.getConfig(guild.id).routing.moderationChannelId, '900000000000000099', 'salon des alertes branché sur les logs');
assert.ok(isModuleEnabled(guild.id, 'anti-nuke'), 'module Protections allumé');
assert.equal(protectionStore.get(guild.id, 'antiMuteVoc').enabled, false, 'vocal non activé pour une communauté');

// Sans « appliquer partout », une protection déjà active garde ses réglages.
assert.ok((await plan('community')).every((i) => i.status === 'already'), 'sans écraser : déjà active');
assert.ok((await plan('community', 'balanced', true)).some((i) => i.status === 'update'), 'en écrasant : mise à jour vers équilibré');
await applyProtectionSetup(guild, { serverType: 'community', severity: 'balanced', alertChannelId: null, overwrite: true });
assert.equal(protectionStore.get(guild.id, 'antiBan').punish, 'derank', 'équilibré : retire les rôles');

// Module Protections éteint : tout est coupé, réglages gardés.
setModuleEnabled(guild.id, 'anti-nuke', false, 'DASHBOARD');
assert.ok(Object.values(protectionStore.all(guild.id)).every((p) => !p.enabled), 'module éteint : plus rien d’actif');
assert.equal(protectionStore.get(guild.id, 'antiBan').logChannelId, '900000000000000099', 'réglages conservés');

console.log('✅ configuration assistée : types, sévérités et application OK');
process.chdir(os.tmpdir());
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
