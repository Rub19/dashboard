/**
 * Carte de bienvenue v2 : chaque modèle se rend en 1600x600, les valeurs invalides retombent sur le défaut (sans
 * faire échouer la config), et le fond personnalisé refuse les adresses internes / non https.
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_welcome_card_v2.ts   (DUMP_DIR=<dossier> pour garder les PNG)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

process.on('unhandledRejection', () => undefined);
const { WelcomeCardGenerator } = await import('../src/modules/welcome/images/welcomeCardGenerator.js');
const { WelcomeImageConfigSchema, CARD_TEMPLATES } = await import('../src/modules/welcome/types/welcomeConfig.js');
const { fetchPublicImage } = await import('../src/utils/publicImageFetch.js');

const avatar = fs.readFileSync(path.resolve('..', 'ethone-next', 'public', 'bot-icons', 'ethone.png'));
const ctx = { userId: '1', username: 'rub19', displayName: 'Rub', userTag: 'rub19', mentionUser: false, guildId: '1', guildName: 'On Joue à quoi ? (feur) ze', memberCount: 14 };
const dump = process.env.DUMP_DIR;

const png = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const variants: [string, Record<string, unknown>][] = [
  ...CARD_TEMPLATES.map((t) => [t, { template: t, animated: false }] as [string, Record<string, unknown>]),
  ['gaming-bebas-rounded', { template: 'gaming', font: 'bebas', avatarShape: 'rounded', accentColor: '#8B5CF6', animated: false }],
  ['default-serif-square-light', { template: 'default', font: 'serif', avatarShape: 'square', backgroundColor: '#F4F1EC', textColor: '#1B1B1F', accentColor: '#C1234F', animated: false }],
  ['minimal-mono-long-name', { template: 'minimal', font: 'mono', subtitleText: 'Un pseudo vraiment beaucoup trop long pour la carte', animated: false }],
];
for (const [name, cfg] of variants) {
  const buf = await WelcomeCardGenerator.generateCard(cfg, '', ctx, avatar);
  assert.deepEqual(png(buf), [1600, 600], `${name} : 1600x600`);
  if (dump) fs.writeFileSync(path.join(dump, `card-${name}.png`), buf);
}
console.log(`  ✅ ${variants.length} variantes rendues en 1600x600`);

// Avatar injoignable : la carte se génère quand même (initiale).
const noAvatar = await WelcomeCardGenerator.generateCard({ template: 'default', animated: false }, '', ctx, null);
assert.deepEqual(png(noAvatar), [1600, 600]);
console.log('  ✅ avatar absent : initiale, pas d’erreur');

const bad = WelcomeImageConfigSchema.parse({ accentColor: 'rouge', template: 'nope', overlayOpacity: 500, customBackgroundUrl: 'http://example.com/a.png', font: 'comic' });
assert.equal(bad.accentColor, '#10B981');
assert.equal(bad.template, 'default');
assert.equal(bad.overlayOpacity, 55);
assert.equal(bad.customBackgroundUrl, null, 'http refusé');
assert.equal(bad.font, 'poppins');
console.log('  ✅ valeurs invalides ramenées au défaut');

for (const u of ['http://example.com/a.png', 'https://127.0.0.1/a.png', 'https://localhost/a.png', 'https://10.0.0.5/x.png', 'https://[::1]/x.png', 'not a url']) {
  assert.equal(await fetchPublicImage(u), null, `refusé : ${u}`);
}
console.log('  ✅ fond : http, adresses locales et privées refusés');
process.exit(0);
