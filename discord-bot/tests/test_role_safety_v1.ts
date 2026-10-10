// Rôles sensibles : jamais donnés sans le staff (libre-service, arrivée, récompenses, boutique, commandes personnalisées).
import assert from 'assert';
import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { isSensitiveRole } from '../src/utils/roleSafety.js';

const role = (perms: bigint[], managed = false) => ({ managed, permissions: new PermissionsBitField(perms) }) as any;

let ok = 0;
const check = (label: string, fn: () => void) => {
  fn();
  ok += 1;
  console.log(`  ✅ ${label}`);
};

check('rôle simple (lire, écrire) accepté', () => assert.equal(isSensitiveRole(role([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel])), false));
check('Administrateur refusé', () => assert.equal(isSensitiveRole(role([PermissionFlagsBits.Administrator])), true));
check('Bannir refusé', () => assert.equal(isSensitiveRole(role([PermissionFlagsBits.BanMembers])), true));
check('Gérer les rôles refusé', () => assert.equal(isSensitiveRole(role([PermissionFlagsBits.ManageRoles])), true));
check('Mentionner @everyone refusé', () => assert.equal(isSensitiveRole(role([PermissionFlagsBits.MentionEveryone])), true));
check("rôle géré par une intégration refusé", () => assert.equal(isSensitiveRole(role([], true)), true));
check('rôle sans permissions connues (simulation) accepté', () => assert.equal(isSensitiveRole({ managed: false } as any), false));

console.log(`\n${ok} réussis, 0 échoués`);
