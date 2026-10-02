/**
 * Carte /rank personnalisable : rendu en 1868x600 (2x) avec ou sans style, valeurs invalides ramenées au défaut
 * sans casser la config des niveaux, et carte de bienvenue jointe au MP désactivée par défaut.
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_rank_card_style_v1.ts   (DUMP_DIR=<dossier> pour garder les PNG)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

process.on('unhandledRejection', () => undefined);
const { renderRankCard } = await import('../src/modules/leveling/images/rankCard.js');
const { LevelingConfigSchema, RankCardStyleSchema } = await import('../src/modules/leveling/types/levelingConfig.js');
const { WelcomeDMConfigSchema } = await import('../src/modules/welcome/types/welcomeConfig.js');

const dump = process.env.DUMP_DIR;
const png = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const base = {
  username: 'rub19', avatarUrl: null, rank: 2, totalMembers: 14, level: 7, totalXp: 4321,
  currentLevelXp: 210, nextLevelXp: 600, progressPercentage: 35, messages: 512, accent: '#C1234F',
  nextReward: { name: 'Habitué', level: 10 },
};
const variants: [string, Record<string, unknown> | null][] = [
  ['defaut', null],
  ['clair-serif-carre', { backgroundColor: '#F4F1EC', textColor: '#1B1B1F', font: 'serif', avatarShape: 'square' }],
  ['bebas-arrondi', { font: 'bebas', avatarShape: 'rounded' }],
];
for (const [name, style] of variants) {
  const buf = await renderRankCard({ ...base, style });
  assert.deepEqual(png(buf), [1868, 600], `${name} : 1868x600`);
  if (dump) fs.writeFileSync(path.join(dump, `rank-${name}.png`), buf);
}

// Valeurs invalides : retour au défaut champ par champ, la config entière reste valide.
const bad = RankCardStyleSchema.parse({ backgroundColor: 'rouge', font: 'comic', avatarShape: 'star', overlayOpacity: 500, backgroundUrl: 'http://127.0.0.1/x.png' });
assert.deepEqual(bad, RankCardStyleSchema.parse({}));
const cfg = LevelingConfigSchema.parse({ rankCard: 'n’importe quoi' });
assert.equal(cfg.rankCard.backgroundColor, '#10131A');
assert.equal(LevelingConfigSchema.parse({}).rankCard.font, 'poppins');

// Carte dans le MP : désactivée tant que l'admin ne l'active pas.
assert.equal(WelcomeDMConfigSchema.parse({}).attachCard, false);
assert.equal(WelcomeDMConfigSchema.parse({ attachCard: true }).attachCard, true);

console.log('✅ test_rank_card_style_v1 : OK');
process.exit(0);
