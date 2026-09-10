import { tagStorage } from './src/modules/tags/storage/tagStorage.js';
import { TAG_NAME_RE } from './src/modules/tags/types/tag.js';

let passed = 0, failed = 0;
const assert = (c: boolean, m: string) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.error(`  ❌ ${m}`), failed++); };

async function run() {
  console.log('🧪 ETHONE Tags Test Suite\n');
  const g = 'g1', u = 'u1';

  console.log('🔤 1. Name regex:');
  assert(TAG_NAME_RE.test('faq'), 'faq ok');
  assert(TAG_NAME_RE.test('rules_2-fr'), 'rules_2-fr ok');
  assert(!TAG_NAME_RE.test('FAQ'), 'uppercase rejected');
  assert(!TAG_NAME_RE.test('has space'), 'space rejected');
  assert(!TAG_NAME_RE.test('a'.repeat(33)), '>32 rejected');

  console.log('\n📦 2. set / get / normalise:');
  const t = tagStorage.set({ guildId: g, name: 'FAQ', content: 'lis les règles', createdBy: u });
  assert(t.name === 'faq', 'name lowercased on set');
  assert(tagStorage.get(g, 'faq')?.content === 'lis les règles', 'get by name');
  assert(tagStorage.get(g, 'FAQ')?.content === 'lis les règles', 'get is case-insensitive');
  assert(t.uses === 0, 'uses starts at 0');

  console.log('\n📦 3. recordUse:');
  tagStorage.recordUse(g, 'faq');
  tagStorage.recordUse(g, 'faq');
  assert(tagStorage.get(g, 'faq')!.uses === 2, 'uses incremented');

  console.log('\n📦 4. edit keeps createdBy + createdAt:');
  const created = tagStorage.get(g, 'faq')!.createdAt;
  await new Promise((r) => setTimeout(r, 5));
  const edited = tagStorage.set({ guildId: g, name: 'faq', content: 'nouveau texte', createdBy: u });
  assert(edited.content === 'nouveau texte', 'content updated');
  assert(edited.createdAt === created, 'createdAt preserved');
  assert(edited.uses === 2, 'uses preserved through edit');

  console.log('\n📦 5. validation:');
  let threw = false;
  try { tagStorage.set({ guildId: g, name: 'bad name!', content: 'x', createdBy: null }); } catch { threw = true; }
  assert(threw, 'invalid name rejected by zod');
  threw = false;
  try { tagStorage.set({ guildId: g, name: 'empty', content: '', createdBy: null }); } catch { threw = true; }
  assert(threw, 'empty content rejected');

  console.log('\n📦 6. isolation + overview:');
  tagStorage.set({ guildId: g, name: 'links', content: 'https://ethone.dev', createdBy: u });
  tagStorage.set({ guildId: 'other', name: 'faq', content: 'autre serveur', createdBy: u });
  assert(tagStorage.getGuild(g).length === 2, 'guild g has 2 tags');
  assert(tagStorage.getGuild('other').length === 1, 'other guild isolated');
  const ov = tagStorage.getOverview(g);
  assert(ov.total === 2 && ov.totalUses === 2, `overview total=${ov.total} uses=${ov.totalUses}`);
  assert(ov.top[0].name === 'faq', 'top tag is faq (most used)');

  console.log('\n📦 7. delete:');
  assert(tagStorage.delete(g, 'faq') === true, 'delete ok');
  assert(tagStorage.delete(g, 'faq') === false, 'second delete false');
  tagStorage.delete(g, 'links'); tagStorage.delete('other', 'faq');
  assert(tagStorage.getGuild(g).length === 0, 'cleaned up');

  console.log(`\n${'='.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'='.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
