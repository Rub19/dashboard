/**
 * Journal d'audit : réglages "Ignorer des salons / rôles / utilisateurs" — aucun log ne doit être livré pour
 * une action dans un salon ignoré, d'un utilisateur ignoré, ou d'un membre ayant un rôle ignoré.
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_log_ignore_filters_v1.ts
 */
import assert from 'node:assert/strict';

const { isLogIgnored } = await import('../src/modules/logs/services/discordLogService.js');

const config = { ignoreChannelIds: ['chan_muted'], ignoreRoleIds: ['role_bot_dev'], ignoreUserIds: ['user_blocked'] };

assert.equal(
  isLogIgnored({ channel: { id: 'chan_muted', name: 'x' }, actor: { id: 'u1', tag: 'a' } }, config),
  true,
  'salon ignoré -> event ignoré'
);
console.log('  ✅ salon ignoré bloque le log');

assert.equal(isLogIgnored({ actor: { id: 'user_blocked', tag: 'a' } }, config), true, 'utilisateur ignoré -> event ignoré');
console.log('  ✅ utilisateur ignoré bloque le log');

assert.equal(
  isLogIgnored({ actor: { id: 'u2', tag: 'a', roleIds: ['role_bot_dev', 'role_other'] } }, config),
  true,
  'rôle ignoré -> event ignoré'
);
console.log('  ✅ membre avec un rôle ignoré bloque le log');

assert.equal(
  isLogIgnored({ channel: { id: 'chan_general', name: 'x' }, actor: { id: 'u3', tag: 'a', roleIds: ['role_other'] } }, config),
  false,
  'rien d’ignoré -> log normal'
);
console.log('  ✅ ni salon, ni rôle, ni utilisateur ignoré : le log passe');

console.log('\nTout est bon');
