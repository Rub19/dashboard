import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

// Les stockages lisent et écrivent ./data : on travaille dans un dossier temporaire.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-setup-'));
process.chdir(tmpDir);

const { planProtectionSetup, applyProtectionSetup } = await import('../src/modules/server/services/protectionSetupService.js');
const { securityStorage } = await import('../src/modules/security/storage/securityStorage.js');
const { raidRepository } = await import('../src/modules/antiRaid/storage/raidRepository.js');
const { autoModRepository } = await import('../src/modules/automod/storage/autoModRepository.js');
const { auditRepository } = await import('../src/modules/logs/storage/auditRepository.js');
const { setModuleEnabled, isModuleEnabled } = await import('../src/services/moduleRegistry.js');

const guild = { id: '900000000000000001' } as any;
for (const m of ['security', 'anti-nuke', 'automod', 'logs']) setModuleEnabled(guild.id, m, false, 'DASHBOARD', undefined, false);

// Types de serveur : même découpage que Keeper.
const friends = planProtectionSetup(guild, { serverType: 'friends', severity: 'balanced', alertChannelId: null, overwrite: false });
const community = planProtectionSetup(guild, { serverType: 'community', severity: 'balanced', alertChannelId: null, overwrite: false });
const large = planProtectionSetup(guild, { serverType: 'large', severity: 'balanced', alertChannelId: null, overwrite: false });
assert.equal(friends.length, 7, 'entre amis : base');
assert.equal(community.length, 16, 'communauté : base + messages et arrivées');
assert.equal(large.filter((i) => i.status === 'unavailable').length, 4, 'grosse communauté : 4 protections vocales indisponibles');
assert.ok(community.every((i) => i.status === 'enable'), 'tout est à activer sur un serveur vierge');
assert.ok(!community.some((i) => i.category === 'Vocal'), 'pas de vocal hors grosse communauté');

// Équilibré : retrait des rôles pour le staff, expulsion pour les arrivées, timeout 10 min pour les messages.
assert.equal(community.find((i) => i.id === 'nuke-sanctions')!.sanction, 'Retire les rôles');
assert.equal(community.find((i) => i.id === 'join-raid')!.sanction, 'Expulse');
assert.equal(community.find((i) => i.id === 'automod-links')!.sanction, 'Supprime + timeout 10 min');

// Application en strict avec un salon d'alertes.
const after = applyProtectionSetup(guild, { serverType: 'community', severity: 'strict', alertChannelId: '900000000000000099', overwrite: false });
assert.ok(after.every((i) => i.status === 'already'), 'après application, tout est en place');
assert.equal(securityStorage.getConfig(guild.id).antiNuke.action, 'ban', 'strict : anti-nuke bannit');
assert.equal(raidRepository.getConfig(guild.id).messageRaid.timeoutDurationSeconds, 3600, 'strict : timeout spam 1 h');
assert.deepEqual(raidRepository.getConfig(guild.id).joinRaid.actions, ['KICK', 'ALERT_STAFF']);
assert.equal(autoModRepository.getConfig(guild.id).timeoutSeconds, 3600, 'strict : timeout AutoMod 1 h');
assert.ok(autoModRepository.getConfig(guild.id).links.enabled, 'détecteur de liens activé');
assert.equal(auditRepository.getConfig(guild.id).routing.moderationChannelId, '900000000000000099', 'salon des alertes branché sur les logs');
assert.ok(['security', 'anti-nuke', 'automod', 'logs'].every((m) => isModuleEnabled(guild.id, m)), 'modules activés');

// Sans « appliquer partout », une protection déjà active garde ses réglages.
const keep = planProtectionSetup(guild, { serverType: 'community', severity: 'balanced', alertChannelId: null, overwrite: false });
assert.ok(keep.every((i) => i.status === 'already'), 'sans écraser : déjà active');
const overwrite = planProtectionSetup(guild, { serverType: 'community', severity: 'balanced', alertChannelId: null, overwrite: true });
assert.ok(overwrite.some((i) => i.status === 'update'), 'en écrasant : mise à jour vers équilibré');
applyProtectionSetup(guild, { serverType: 'community', severity: 'balanced', alertChannelId: null, overwrite: true });
assert.equal(securityStorage.getConfig(guild.id).antiNuke.action, 'strip_roles', 'équilibré : retire les rôles');

console.log('✅ configuration assistée : types, sévérités et application OK');
process.chdir(os.tmpdir());
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
