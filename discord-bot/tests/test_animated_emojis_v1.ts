/**
 * Émojis animés et cartes animées :
 * - ✅ ❌ ⚠️ deviennent les émojis d'application animés dans le contenu, les descriptions, les valeurs de champs,
 *   les textes V2 et les boutons, mais pas dans les titres (Discord ne les y affiche pas) ;
 * - rien ne change si l'émoji n'est pas synchronisé ou si une limite de longueur serait dépassée ;
 * - la carte de bienvenue par défaut est un GIF animé (images différentes), une image de fond garde le PNG.
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_animated_emojis_v1.ts
 */
import assert from 'node:assert/strict';

process.on('unhandledRejection', () => undefined);
const { appEmojiMap } = await import('../src/services/appEmojis.js');
const { installAnimatedEmojis } = await import('../src/services/animatedEmojis.js');
const { WelcomeCardGenerator } = await import('../src/modules/welcome/images/welcomeCardGenerator.js');
const { cardFileName } = await import('../src/modules/welcome/images/animatedCard.js');

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => unknown | Promise<unknown>) {
  try {
    await fn();
    console.log(`  ✔ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✘ ${name}\n    ${(err as Error).message}`);
    failed++;
  }
}

const sent: any[] = [];
const fakeClient: any = { rest: { request: async (o: any) => (sent.push(o), o) } };
installAnimatedEmojis(fakeClient);
const send = async (fullRoute: string, body: any) => {
  await fakeClient.rest.request({ fullRoute, method: 'POST', body });
  return sent.at(-1).body;
};

await test('sans émoji synchronisé, le message part tel quel', async () => {
  const body = await send('/channels/1/messages', { content: '✅ Fait' });
  assert.equal(body.content, '✅ Fait');
});

appEmojiMap().set('etho_a_check', '<a:etho_a_check:111>');
appEmojiMap().set('etho_a_cross', '<a:etho_a_cross:222>');
appEmojiMap().set('etho_a_warning', '<a:etho_a_warning:333>');

await test('contenu, description et valeurs de champs utilisent les émojis animés', async () => {
  const body = await send('/channels/1/messages', {
    content: '✅ Fait',
    embeds: [{ title: '✅ Titre', description: '❌ Non', fields: [{ name: '⚠️ Nom', value: '⚠️ Attention' }] }],
  });
  assert.equal(body.content, '<a:etho_a_check:111> Fait');
  assert.equal(body.embeds[0].title, '✅ Titre', 'les titres restent en Unicode');
  assert.equal(body.embeds[0].description, '<a:etho_a_cross:222> Non');
  assert.equal(body.embeds[0].fields[0].name, '⚠️ Nom');
  assert.equal(body.embeds[0].fields[0].value, '<a:etho_a_warning:333> Attention');
});

await test('boutons et textes V2 d\'une réponse d\'interaction', async () => {
  const body = await send('/interactions/9/tok/callback', {
    type: 4,
    data: {
      components: [
        { type: 17, components: [{ type: 10, content: '✅ Enregistré' }] },
        { type: 1, components: [{ type: 2, style: 3, label: 'Valider', emoji: { name: '✅' } }, { type: 2, style: 4, label: 'Annuler', emoji: { name: '🔥' } }] },
      ],
    },
  });
  assert.equal(body.data.components[0].components[0].content, '<a:etho_a_check:111> Enregistré');
  assert.deepEqual(body.data.components[1].components[0].emoji, { id: '111', name: 'etho_a_check', animated: true });
  assert.deepEqual(body.data.components[1].components[1].emoji, { name: '🔥' }, 'les autres émojis ne changent pas');
});

await test('une limite de longueur dépassée garde le texte d\'origine', async () => {
  const content = '✅'.repeat(400) + 'x'.repeat(1200);
  const body = await send('/channels/1/messages', { content });
  assert.equal(body.content, content);
});

await test('les autres routes ne sont pas touchées', async () => {
  const body = await send('/guilds/1/roles', { name: '✅ Rôle' });
  assert.equal(body.name, '✅ Rôle');
});

const ctx: any = { displayName: 'Rub', username: 'rub', guildName: 'ETHONE', memberCount: 42 };

await test('carte par défaut : GIF animé (plusieurs images différentes)', async () => {
  const buf = await WelcomeCardGenerator.generateCard({ template: 'default' }, '', ctx);
  assert.equal(cardFileName(buf), 'card.gif');
  // Le GIF contient plusieurs images (bloc « image descriptor » 0x2C répété) et pèse moins de 8 Mo.
  const frames = buf.toString('latin1').split('\x00\x2c').length - 1;
  assert.ok(frames >= 10, `seulement ${frames} images`);
  assert.ok(buf.length < 8 * 1024 * 1024);
});

await test('carte avec animation désactivée : PNG', async () => {
  const buf = await WelcomeCardGenerator.generateCard({ template: 'default', animated: false }, '', ctx);
  assert.equal(cardFileName(buf), 'card.png');
});

console.log(`\n${passed} réussi(s), ${failed} échec(s)`);
process.exit(failed ? 1 : 0);
