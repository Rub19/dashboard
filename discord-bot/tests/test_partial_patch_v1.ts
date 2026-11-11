import assert from 'node:assert/strict';
import { z } from 'zod';
import { partialPatch } from '../src/utils/partialPatch.js';
import { AfkConfigSchema } from '../src/modules/afk/types/afk.js';
import { BirthdayConfigSchema } from '../src/modules/birthdays/types/birthday.js';
import { AntiRaidConfigSchema } from '../src/modules/antiRaid/types/antiRaid.js';
import { AutoModConfigSchema } from '../src/modules/automod/types/autoMod.js';
import { AntiNukeConfigSchema } from '../src/modules/security/types/securityConfig.js';
import { GamesConfigSchema } from '../src/modules/games/types/games.js';
import { ProtectionSettingsSchema } from '../src/modules/protections/protectionStore.js';

const schemas: Record<string, z.ZodObject<z.ZodRawShape>> = {
  AfkConfigSchema,
  BirthdayConfigSchema,
  AntiRaidConfigSchema,
  AutoModConfigSchema,
  AntiNukeConfigSchema,
  GamesConfigSchema,
  ProtectionSettingsSchema,
} as never;

for (const [name, schema] of Object.entries(schemas)) {
  assert.deepEqual(partialPatch(schema).parse({}), {}, name);
}
console.log('  ✅ corps vide : aucun réglage remis à sa valeur par défaut');

const sample = z.object({
  enabled: z.boolean().default(false),
  retries: z.number().default(3),
  nested: z.object({ limit: z.number().default(5) }).prefault({}),
});
assert.deepEqual(partialPatch(sample).parse({ enabled: true }), { enabled: true });
console.log('  ✅ seul le champ envoyé ressort');

assert.deepEqual(partialPatch(sample).parse({ nested: {} }), { nested: { limit: 5 } });
console.log('  ✅ objet imbriqué envoyé : ses valeurs par défaut restent appliquées');

assert.equal(partialPatch(sample).safeParse({ retries: 'x' }).success, false);
assert.equal(partialPatch(sample).strict().safeParse({ unknown: 1 }).success, false);
console.log('  ✅ valeur invalide et champ inconnu (strict) refusés');

console.log('\nTout est bon');
process.exit(0);
